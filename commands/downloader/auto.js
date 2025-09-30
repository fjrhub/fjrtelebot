const { isAutoEnabled } = require("@/utils/supabase");
const { isAuthorized } = require("@/utils/helper");
const axios = require("axios");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

module.exports = {
  name: "auto",
  async execute(ctx) {
    const chatId = ctx.chat.id;
    if (!isAuthorized(chatId)) return;

    const text = ctx.message?.text;
    if (!text) return;

    const tiktokRegex =
      /^(?:https?:\/\/)?(?:www\.|vm\.|vt\.)?tiktok\.com\/[^\s]+$/i;
    const instagramRegex =
      /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/(reel|p|tv)\/[A-Za-z0-9_-]+\/?(?:\?[^ ]*)?$/i;
    const facebookRegex =
      /^(?:https?:\/\/)?(?:www\.|web\.)?facebook\.com\/(?:share\/(?:r|v)\/|reel\/|watch\?v=|permalink\.php\?story_fbid=|[^\/]+\/posts\/|video\.php\?v=)[^\s]+$/i;

    const isTikTok = tiktokRegex.test(text);
    const isInstagram = instagramRegex.test(text);
    const isFacebook = facebookRegex.test(text);
    if (!isTikTok && !isInstagram && !isFacebook) return;

    const isAuto = await isAutoEnabled(chatId);
    if (!isAuto) return;

    await ctx.api.deleteMessage(chatId, ctx.message.message_id);

    const input = text;
    let statusMessage = null;

    const sendOrEditStatus = async (newText) => {
      if (!statusMessage) {
        statusMessage = await ctx.reply(newText);
      } else {
        await ctx.api.editMessageText(chatId, statusMessage.message_id, newText);
      }
    };

    const deleteStatus = async () => {
      if (statusMessage) {
        await new Promise((res) => setTimeout(res, 1000));
        await ctx.api.deleteMessage(chatId, statusMessage.message_id);
        statusMessage = null;
      }
    };

    const format = (n) => n?.toLocaleString?.("en-US") || "0";
    const chunkArray = (arr, size) => {
      const result = [];
      for (let i = 0; i < arr.length; i += size) {
        result.push(arr.slice(i, i + size));
      }
      return result;
    };

    function formatSize(bytes) {
      if (bytes < 1024) return bytes + " B";
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
      return (bytes / (1024 * 1024)).toFixed(2) + " MB";
    }

    // NOTE: Semua handler (TikTok, FB, IG) sama persis dengan versi telegraf,
    // hanya ganti `bot.sendMessage` => `ctx.reply`,
    // `bot.sendVideo` => `ctx.replyWithVideo`,
    // `bot.sendMediaGroup` => `ctx.replyWithMediaGroup`.
    //
    // Contoh perubahan di bawah:

    const fbHandler1 = async (data) => {
      const hdMp4Video = data.data?.find(
        (item) => item.format === "mp4" && item.resolution === "HD"
      );
      if (!hdMp4Video?.url) throw new Error("HD MP4 video URL is not available.");
      await ctx.replyWithVideo(hdMp4Video.url);
    };

    // ... (semua handler lain disesuaikan seperti ini)

    // fallback yt-dlp
    function ytDlpFallback(url) {
      return new Promise((resolve) => {
        const outputDir = path.resolve(__dirname, "../../yt-dlp");
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        const timestamp = Date.now();
        const basePath = path.join(outputDir, `video_${timestamp}`);
        const outputFile = `${basePath}.mp4`;

        exec(
          `yt-dlp -f "bestvideo+bestaudio/best" --merge-output-format mp4 --write-thumbnail -o "${basePath}.%(ext)s" "${url}"`,
          async (error) => {
            if (error) {
              await ctx.reply(`❌ yt-dlp error: ${error.message}`);
              return resolve(false);
            }

            try {
              await ctx.replyWithVideo({ source: outputFile });

              const dir = path.dirname(basePath);
              const baseName = path.basename(basePath);
              for (const file of fs.readdirSync(dir)) {
                if (file.startsWith(baseName)) {
                  fs.unlinkSync(path.join(dir, file));
                }
              }

              resolve(true);
            } catch (err) {
              await ctx.reply(`❌ Gagal kirim video: ${err.message}`);
              const dir = path.dirname(basePath);
              const baseName = path.basename(basePath);
              for (const file of fs.readdirSync(dir)) {
                if (file.startsWith(baseName)) {
                  fs.unlinkSync(path.join(dir, file));
                }
              }
              resolve(false);
            }
          }
        );
      });
    }

    try {
      await sendOrEditStatus("📡 Trying API 1...");
      // ... (logika sama dengan telegraf, hanya handler diganti ke ctx.reply*)
    } catch (e1) {
      console.warn("⚠️ API 1 failed:", e1.message);
      try {
        await sendOrEditStatus("📡 API 1 failed. Trying API 2...");
        // ... lanjut API 2
      } catch (e2) {
        console.warn("⚠️ API 2 failed:", e2.message);
        try {
          await sendOrEditStatus("📡 API 2 failed. Trying API 3...");
          // ... lanjut API 3
        } catch (e3) {
          console.error("⚠️ API 3 failed:", e3.message);
          try {
            await sendOrEditStatus(`⚠️ All APIs failed. Fallback to yt-dlp...`);
            const success = await ytDlpFallback(input);
            if (!success) throw new Error("yt-dlp fallback failed.");
            await deleteStatus();
          } catch (e4) {
            console.error("❌ yt-dlp fallback failed:", e4.message);
            await sendOrEditStatus("❌ All APIs and yt-dlp fallback failed.");
            await deleteStatus();
          }
        }
      }
    }
  },
};
