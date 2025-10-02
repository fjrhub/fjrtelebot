const { isAutoEnabled } = require("@/utils/supabase");
const { isAuthorized } = require("@/utils/helper");
const axios = require("axios");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const { InputFile } = require("grammy");

module.exports = {
  name: "auto",
  async execute(ctx) {
    const chatId = ctx.chat?.id;
    if (!chatId) return;
    if (!isAuthorized(chatId)) return;

    const text = ctx.message?.text?.trim();
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

    // delete original (user) message (best-effort)
    try {
      await ctx.api.deleteMessage(chatId, ctx.message.message_id);
    } catch (err) {
      // ignore if can't delete
      console.warn("Could not delete original message:", err?.message);
    }

    const input = text;
    let statusMessage = null;

    const sendOrEditStatus = async (newText) => {
      if (!statusMessage) {
        try {
          statusMessage = await ctx.reply(newText);
        } catch (e) {
          // fallback: use api.sendMessage
          statusMessage = await ctx.api.sendMessage(chatId, newText);
        }
      } else {
        try {
          await ctx.api.editMessageText(
            chatId,
            statusMessage.message_id,
            newText
          );
        } catch (e) {
          // ignore edit failure
        }
      }
    };

    const deleteStatus = async () => {
      if (statusMessage) {
        await new Promise((res) => setTimeout(res, 1000));
        try {
          await ctx.api.deleteMessage(chatId, statusMessage.message_id);
        } catch (e) {
          // ignore
        }
        statusMessage = null;
      }
    };

    const toNumberFormat = (n) =>
      n === undefined || n === null
        ? "0"
        : n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    function formatSize(bytes) {
      if (!bytes && bytes !== 0) return "0 B";
      bytes = Number(bytes);
      if (Number.isNaN(bytes)) return "0 B";
      if (bytes < 1024) return bytes + " B";
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
      if (bytes < 1024 * 1024 * 1024)
        return (bytes / (1024 * 1024)).toFixed(2) + " MB";
      return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
    }

    const chunkArray = (arr, size) => {
      if (!Array.isArray(arr)) return [];
      const result = [];
      for (let i = 0; i < arr.length; i += size) {
        result.push(arr.slice(i, i + size));
      }
      return result;
    };

    // -------------------- HANDLERS --------------------

    // TikTok handler variations
    const tthandler1 = async (ctx, chatId, data) => {
      if (!data || typeof data !== "object" || !data.result) {
        throw new Error("Invalid data format: missing expected properties.");
      }
      const r = data.result;
      const playCount = r.play_count || 0;
      const commentCount = r.comment_count || 0;
      const shareCount = r.share_count || 0;
      const downloadCount = r.download_count || 0;
      const sizeInBytes = r.hd_size || 0;

      const caption = [
        `Play Count: ${toNumberFormat(playCount)}`,
        `Comment Count: ${toNumberFormat(commentCount)}`,
        `Share Count: ${toNumberFormat(shareCount)}`,
        `Download Count: ${toNumberFormat(downloadCount)}`,
        `Size: ${formatSize(sizeInBytes)}`,
      ].join("\n");

      const images = Array.isArray(r.images) ? r.images : [];

      if (images.length > 0) {
        const groups = chunkArray(images, 10);
        for (const grp of groups) {
          const mediaGroup = grp.map((url, idx) => ({
            type: "photo",
            media: url,
            ...(idx === 0 ? { caption, parse_mode: "Markdown" } : {}),
          }));
          await ctx.api.sendMediaGroup(chatId, mediaGroup);
        }
        return;
      }

      const hdPlayUrl = r.hdplay || r.play || r.wmplay;
      if (
        !hdPlayUrl ||
        typeof hdPlayUrl !== "string" ||
        !hdPlayUrl.startsWith("http")
      ) {
        throw new Error("Invalid HD play URL from API.");
      }
      await ctx.api.sendVideo(chatId, hdPlayUrl, {
        caption,
        parse_mode: "Markdown",
        supports_streaming: true,
      });
    };

    const tthandler2 = async (ctx, chatId, data) => {
      if (!data || typeof data !== "object" || !data.metadata) {
        throw new Error("Invalid data format: metadata missing.");
      }
      const md = data.metadata;
      const statsOnly = [
        `Views: ${toNumberFormat(md.view)}`,
        `Comments: ${toNumberFormat(md.comment)}`,
        `Shares: ${toNumberFormat(md.share)}`,
        `Downloads: ${toNumberFormat(md.download)}`,
      ].join("\n");

      const caption = `${
        md.durasi && md.durasi > 0 ? `Duration: ${md.durasi}s\n` : ""
      }${statsOnly}`;

      if (
        Array.isArray(data.media?.image_slide) &&
        data.media.image_slide.length > 0
      ) {
        const groups = chunkArray(data.media.image_slide, 10);
        for (const grp of groups) {
          const mediaGroup = grp.map((url, idx) => ({
            type: "photo",
            media: url,
            ...(idx === 0 ? { caption, parse_mode: "Markdown" } : {}),
          }));
          await ctx.api.sendMediaGroup(chatId, mediaGroup);
        }
        return;
      }

      if (data.media?.play && md.durasi > 0) {
        await ctx.api.sendVideo(chatId, data.media.play, {
          caption,
          parse_mode: "Markdown",
          supports_streaming: true,
        });
        return;
      }

      throw new Error("API 2 returned no valid downloadable content.");
    };

    const tthandler3 = async (ctx, chatId, data) => {
      if (!data || typeof data !== "object") {
        throw new Error("Invalid API 3 data.");
      }
      const photos = Array.isArray(data.data)
        ? data.data.filter((item) => item.type === "photo")
        : [];
      const video = Array.isArray(data.data)
        ? data.data.find((item) => item.type === "nowatermark")
        : null;

      const statsOnly = [
        `Views: ${data.stats?.views ?? "?"}`,
        `Comments: ${data.stats?.comment ?? "?"}`,
        `Shares: ${data.stats?.share ?? "?"}`,
        `Downloads: ${data.stats?.download ?? "?"}`,
      ].join("\n");

      const caption = `${
        data.durations && data.durations > 0
          ? `Duration: ${data.durations}s\n`
          : ""
      }${statsOnly}`;

      if (photos.length > 0) {
        const groups = chunkArray(
          photos.map((p) => p.url),
          10
        );
        for (const grp of groups) {
          const mediaGroup = grp.map((url, idx) => ({
            type: "photo",
            media: url,
            ...(idx === 0 ? { caption, parse_mode: "Markdown" } : {}),
          }));
          await ctx.api.sendMediaGroup(chatId, mediaGroup);
        }
        return;
      }

      if (video?.url && data.durations > 0) {
        await ctx.api.sendVideo(chatId, video.url, {
          caption,
          parse_mode: "Markdown",
          supports_streaming: true,
        });
        return;
      }

      throw new Error("API 3 returned no valid downloadable content.");
    };

    // Facebook handlers
    const fbHandler1 = async (ctx, chatId, data) => {
      if (!data || !Array.isArray(data.data))
        throw new Error("Invalid FB API 1 format.");
      const hdMp4Video = data.data.find(
        (item) => item.format === "mp4" && item.resolution === "HD"
      );
      if (!hdMp4Video?.url) throw new Error("HD MP4 URL not found.");
      await ctx.api.sendVideo(chatId, hdMp4Video.url);
    };

    const fbHandler2 = async (ctx, chatId, data) => {
      if (!data) throw new Error("Invalid FB API 2 format.");
      const videoUrl = data.media?.[2] || data.media?.[0] || null;
      if (!videoUrl) throw new Error("No HD video URL found in API 2.");
      await ctx.api.sendVideo(chatId, videoUrl);
    };

    const fbHandler3 = async (ctx, chatId, data) => {
      if (!data) throw new Error("Invalid FB API 3 format.");
      const videoUrl = data.hd_url || data.sd_url;
      if (!videoUrl) throw new Error("No video URL found in API 3.");
      await ctx.api.sendVideo(chatId, videoUrl);
    };

    // Instagram handlers
    const igHandler1 = async (ctx, chatId, data) => {
      if (!data || !Array.isArray(data.result))
        throw new Error("Invalid IG API 1 format.");
      const results = data.result;
      if (!results.length) throw new Error("IG API 1 returned empty media.");

      const urls = results.map((i) => i?.url).filter(Boolean);
      if (!urls.length) throw new Error("No valid media URLs in IG API 1.");

      const video = urls.find((u) => u.includes(".mp4"));
      const photos = urls.filter((u) => !u.includes(".mp4"));

      if (video) {
        await ctx.api.sendVideo(chatId, video);
        return;
      }

      if (photos.length) {
        const groups = chunkArray(photos, 10);
        for (const grp of groups) {
          const mediaGroup = grp.map((url) => ({ type: "photo", media: url }));
          await ctx.api.sendMediaGroup(chatId, mediaGroup);
        }
        return;
      }

      throw new Error("IG API 1 returned unsupported media.");
    };

    const igHandler2 = async (ctx, chatId, data) => {
      if (!data || typeof data !== "object")
        throw new Error("Invalid IG API 2 format.");
      const result = data.result || {};
      const mediaUrls = Array.isArray(result.url)
        ? result.url
        : typeof result.url === "string"
        ? [result.url]
        : [];
      const isVideo = !!result.isVideo;

      const caption = `${toNumberFormat(result.like)} Likes`;

      if (isVideo && mediaUrls.length) {
        await ctx.api.sendVideo(chatId, mediaUrls[0], {
          caption,
          parse_mode: "Markdown",
          supports_streaming: true,
        });
        return;
      }

      if (!isVideo && mediaUrls.length) {
        const groups = chunkArray(mediaUrls, 10);
        for (const grp of groups) {
          const mediaGroup = grp.map((url, idx) => ({
            type: "photo",
            media: url,
            ...(idx === 0 ? { caption, parse_mode: "Markdown" } : {}),
          }));
          await ctx.api.sendMediaGroup(chatId, mediaGroup);
        }
        return;
      }

      throw new Error("IG API 2 returned no valid media.");
    };

    const igHandler3 = async (ctx, chatId, data) => {
      const mediaItems = Array.isArray(data?.result?.response?.data)
        ? data.result.response.data
        : [];
      if (!mediaItems.length)
        throw new Error("IG API 3 returned empty media array.");

      const images = mediaItems
        .filter((i) => i.type === "image")
        .map((i) => i.url);
      const videos = mediaItems
        .filter((i) => i.type === "video")
        .map((i) => i.url);

      if (videos.length) {
        await ctx.api.sendVideo(chatId, videos[0], {
          supports_streaming: true,
        });
        return;
      }

      if (images.length) {
        const groups = chunkArray(images, 10);
        for (const grp of groups) {
          const mediaGroup = grp.map((u) => ({ type: "photo", media: u }));
          await ctx.api.sendMediaGroup(chatId, mediaGroup);
        }
        return;
      }

      throw new Error("IG API 3 returned unsupported media.");
    };

    // helper fallback
    async function ytDlpFallback(ctx, url) {
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
              await ctx.replyWithVideo(new InputFile(outputFile));

              // cleanup
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

              // tetap cleanup
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

    // -------------------- MAIN FLOW (3 API attempts + fallback) --------------------
    try {
      await sendOrEditStatus("📡 Trying API 1...");

      if (isFacebook) {
        const res1 = await axios.get(
          createUrl(
            "siputzx",
            `/api/d/facebook?url=${encodeURIComponent(input)}`
          ),
          {
            timeout: 8000,
          }
        );
        const data1 = res1.data?.data;
        if (!res1.data?.status || !data1)
          throw new Error(
            "API 1 (Siputzx - Facebook) returned invalid response"
          );
        await fbHandler1(ctx, chatId, data1);
        await deleteStatus();
        return;
      }

      if (isInstagram) {
        const res1 = await axios.get(
          `${
            process.env.diioffc
          }/api/download/instagram?url=${encodeURIComponent(input)}`,
          { timeout: 10000 }
        );
        const data1 = res1.data;
        if (
          !data1?.status ||
          !Array.isArray(data1.result) ||
          data1.result.length === 0
        )
          throw new Error(
            "API 1 (diioffc - Instagram) returned invalid response"
          );
        await igHandler1(ctx, chatId, data1);
        await deleteStatus();
        return;
      }

      // TikTok API 1
      const res1 = await axios.get(
        `${process.env.diioffc}/api/download/tiktok?url=${encodeURIComponent(
          input
        )}`,
        { timeout: 10000 }
      );
      const data1 = res1.data?.result;
      if (!res1.data?.status || !data1)
        throw new Error("API 1 (diioffc - Tiktok) returned invalid response");
      await tthandler1(ctx, chatId, { result: data1 });
      await deleteStatus();
      return;
    } catch (e1) {
      console.warn("⚠️ API 1 failed:", e1?.message);
      try {
        await sendOrEditStatus("📡 API 1 failed. Trying API 2...");

        if (isFacebook) {
          const res2 = await axios.get(
            `${
              process.env.archive
            }/api/download/facebook?url=${encodeURIComponent(input)}`,
            { timeout: 10000 }
          );
          const result2 = res2.data?.result;
          if (!res2.data?.status || !result2)
            throw new Error(
              "API 2 (Archive - Facebook) returned invalid response"
            );
          await fbHandler2(ctx, chatId, result2);
          await deleteStatus();
          return;
        }

        if (isInstagram) {
          const res2 = await axios.get(
            `${
              process.env.archive
            }/api/download/instagram?url=${encodeURIComponent(input)}`,
            { timeout: 10000 }
          );
          const data2 = res2.data;
          if (!data2?.status || !data2.result)
            throw new Error(
              "API 2 (Archive - Instagram) returned invalid response"
            );
          await igHandler2(ctx, chatId, data2);
          await deleteStatus();
          return;
        }

        // TikTok API 2
        const res2 = await axios.get(
          `${process.env.archive}/api/download/tiktok?url=${encodeURIComponent(
            input
          )}`,
          { timeout: 10000 }
        );
        const result2 = res2.data?.result;
        if (!res2.data?.status || !result2)
          throw new Error("API 2 (Archive - Tiktok) returned invalid response");
        await tthandler2(ctx, chatId, result2);
        await deleteStatus();
        return;
      } catch (e2) {
        console.warn("⚠️ API 2 failed:", e2?.message);
        try {
          await sendOrEditStatus("📡 API 2 failed. Trying API 3...");

          if (isFacebook) {
            const res3 = await axios.get(
              `${process.env.vreden}/api/fbdl?url=${encodeURIComponent(input)}`,
              { timeout: 10000 }
            );
            const result3 = res3.data?.data;
            if (!result3)
              throw new Error(
                "API 3 (Vreden - Facebook) returned invalid response"
              );
            await fbHandler3(ctx, chatId, result3);
            await deleteStatus();
            return;
          }

          if (isInstagram) {
            const res3 = await axios.get(
              `${process.env.vreden}/api/igdownload?url=${encodeURIComponent(
                input
              )}`,
              { timeout: 10000 }
            );
            const data3 = res3.data;
            if (!data3?.status || !data3?.result)
              throw new Error(
                "API 3 (Vreden - Instagram) returned invalid response"
              );
            await igHandler3(ctx, chatId, data3);
            await deleteStatus();
            return;
          }

          // TikTok API 3
          const res3 = await axios.get(
            `${process.env.vreden}/api/tiktok?url=${encodeURIComponent(input)}`,
            { timeout: 10000 }
          );
          const result3 = res3.data?.result;
          if (!res3.data?.status || !result3)
            throw new Error(
              "API 3 (Vreden - Tiktok) returned invalid response"
            );
          await tthandler3(ctx, chatId, result3);
          await deleteStatus();
          return;
        } catch (e3) {
          console.error("⚠️ API 3 failed:", e3?.message);

          try {
            await sendOrEditStatus("⚠️ All APIs failed. Fallback to yt-dlp...");
            const success = await ytDlpFallback(ctx, input);
            if (!success) throw new Error("yt-dlp fallback failed.");
            await deleteStatus();
            return;
          } catch (e4) {
            console.error("❌ yt-dlp fallback failed:", e4?.message);
            try {
              await sendOrEditStatus("❌ All APIs and yt-dlp fallback failed.");
            } catch (e) {}
            await deleteStatus();
            return;
          }
        }
      }
    }
  },
};
