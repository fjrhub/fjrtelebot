const { isAutoEnabled } = require("@/utils/supabase");
const { isAuthorized } = require("@/utils/helper");
const axios = require("axios");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const { InputFile } = require("grammy");
const https = require("https");

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
      /^(?:https?:\/\/)?(?:www\.|web\.)?facebook\.com\/(?:share\/(?:r|v|p)\/|reel\/|watch\?v=|permalink\.php\?story_fbid=|[^\/]+\/posts\/|video\.php\?v=)[^\s]+$/i;

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
        await new Promise((res) => setTimeout(res, 5000));
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

    const chunkArray = (arr, size) => {
      if (!Array.isArray(arr)) return [];
      const result = [];
      for (let i = 0; i < arr.length; i += size) {
        result.push(arr.slice(i, i + size));
      }
      return result;
    };

    async function getWithTimeout(url, timeoutMs = 8000) {
      const start = Date.now(); // ⏱️ mulai hitung waktu

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        const res = await axios.get(url, { signal: controller.signal });
        clearTimeout(timer);

        const duration = ((Date.now() - start) / 1000).toFixed(2);
        console.log(`✅ API fetched in ${duration}s`);
        return res;
      } catch (err) {
        const duration = ((Date.now() - start) / 1000).toFixed(2);
        if (err.name === "AbortError") {
          console.warn(`⚠️ API request timed out after ${duration}s`);
          throw new Error(`Request timeout after ${timeoutMs / 1000} seconds`);
        }
        console.error(`❌ API fetch failed after ${duration}s: ${err.message}`);
        throw err;
      }
    }

    // Fungsi delay sederhana
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    // Fungsi bantu untuk mempersingkat angka
    const formatNumber = (num) => {
      if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
      if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
      return num.toString();
    };

    // -------------------- HANDLERS --------------------

    // TikTok handler variations
    const tthandler1 = async (ctx, chatId, data) => {
      if (!data?.data || !data.data.download)
        throw new Error("Invalid TikTok API response structure.");

      const { download, metadata } = data.data;

      const videos = Array.isArray(download.video)
        ? download.video.filter(Boolean)
        : [];
      const photos = Array.isArray(download.photo)
        ? download.photo.filter(Boolean)
        : [];

      if (!videos.length && !photos.length)
        throw new Error("No downloadable media found from TikTok API.");

      // Ambil statistik
      const stats = metadata?.stats || {};
      const like = stats.likeCount || 0;
      const play = stats.playCount || 0;
      const comment = stats.commentCount || 0;
      const share = stats.shareCount || 0;

      // Format caption (pakai emoji + format singkat)
      const caption = `❤️ ${formatNumber(like)} ▶️ ${formatNumber(
        play
      )} 💬 ${formatNumber(comment)} ↗️ ${formatNumber(share)}`;

      // Jika ada video
      if (videos.length) {
        const firstVideo = videos[1];
        try {
          await ctx.api.sendVideo(chatId, firstVideo, { caption });
        } catch (e) {
          console.error("Gagal kirim video:", e.message);
          throw e; // ⬅️ tambahkan ini agar error dilempar keluar
        }
        return;
      }

      // Jika ada foto
      if (photos.length) {
        const groups = chunkArray(photos, 10);

        for (const grp of groups) {
          const mediaGroup = grp.map((url, i) => ({
            type: "photo",
            media: url,
            caption: i === 0 ? caption : undefined, // caption hanya di foto pertama
          }));

          try {
            await ctx.api.sendMediaGroup(chatId, mediaGroup);
          } catch (e) {
            if (
              e.error_code === 429 ||
              e.description?.includes("Too Many Requests")
            ) {
              console.warn("⚠️ Rate limited! Waiting 5 seconds...");
              await delay(5000); // tunggu 5 detik kalau rate limit
            } else {
              console.error("❌ Gagal kirim media group:", e.message);
            }
          }

          // Delay 1.5 detik antar batch kiriman
          await delay(1500);
        }
      }
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

      // Jika ada image slide
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

          try {
            await ctx.api.sendMediaGroup(chatId, mediaGroup);
          } catch (err) {
            console.error(
              "⚠️ Failed to send media group:",
              err.description || err.message
            );
          }

          // Delay 1.5 detik antar batch kiriman foto
          await delay(1500);
        }
        return;
      }

      // Jika ada video
      if (data.media?.play && md.durasi > 0) {
        try {
          await ctx.api.sendVideo(chatId, data.media.play, {
            caption,
            parse_mode: "Markdown",
            supports_streaming: true,
          });
        } catch (err) {
          console.error(
            "⚠️ Failed to send video:",
            err.description || err.message
          );
        }
        return; // tanpa delay di bagian video
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
          await delay(1500); // Delay hanya untuk kirim foto
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
      if (!data || !Array.isArray(data.data))
        throw new Error(
          "Invalid API format: data field not found or not array."
        );

      const results = data.data;
      if (!results.length) throw new Error("API returned empty media list.");

      // Ambil semua URL valid
      const urls = results.map((i) => i?.url).filter(Boolean);
      if (!urls.length) throw new Error("No valid media URLs found.");

      // Cek apakah ada video (file .mp4)
      const video = urls.find((u) => u.includes(".mp4"));
      const photos = urls.filter((u) => !u.includes(".mp4"));

      if (video) {
        // Kirim video
        await ctx.api.sendVideo(chatId, video);
        return;
      }

      if (photos.length) {
        // Bagi foto menjadi grup berisi maksimal 10 item
        const groups = chunkArray(photos, 10);

        for (const grp of groups) {
          const mediaGroup = grp.map((url) => ({ type: "photo", media: url }));

          try {
            await ctx.api.sendMediaGroup(chatId, mediaGroup);
          } catch (err) {
            console.error(
              "Gagal kirim media group:",
              err.description || err.message
            );
          }

          // Delay 1.5 detik sebelum kirim grup berikutnya
          await delay(1500);
        }

        return;
      }

      throw new Error("No media content detected.");
    };

    const igHandler2 = async (ctx, chatId, data) => {
      if (!data || typeof data !== "object") {
        throw new Error("Invalid IG API 2 format.");
      }

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
          await delay(1500); // delay hanya di foto
        }

        return;
      }

      throw new Error("IG API 2 returned no valid media.");
    };

    const igHandler3 = async (ctx, chatId, data) => {
      const mediaItems = Array.isArray(data?.result?.response?.data)
        ? data.result.response.data
        : [];

      if (!mediaItems.length) {
        throw new Error("IG API 3 returned empty media array.");
      }

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
          await delay(1500); // delay hanya untuk foto
        }
        return;
      }

      throw new Error("IG API 3 returned unsupported media.");
    };

    // helper fallback
    // fungsi untuk resolve redirect URL (vt.tiktok → www.tiktok)
    function resolveRedirect(url) {
      return new Promise((resolve) => {
        https
          .get(url, (res) => {
            if (res.headers.location) {
              resolve(res.headers.location);
            } else {
              resolve(url);
            }
          })
          .on("error", () => resolve(url));
      });
    }

    async function ytDlpFallback(ctx, url, sendOrEditStatus) {
      // 🌐 Langsung ambil URL input tanpa resolveRedirect()
      const resolvedUrl = url.trim();

      // Deteksi platform
      const isTikTok = resolvedUrl.includes("tiktok.com");
      const isInstagram = resolvedUrl.includes("instagram.com");
      const isFacebook = resolvedUrl.includes("facebook.com");

      console.log("🔍 [ytDlpFallback] URL dari input:", resolvedUrl);

      // 📸 Skip semua jenis URL foto / non-video
      if (
        /\.(jpg|jpeg|png|webp|gif)$/i.test(resolvedUrl) ||
        resolvedUrl.includes("/photo/") ||
        resolvedUrl.includes("/p/") ||
        resolvedUrl.includes("/share/p/") ||
        resolvedUrl.includes("/unsupportedbrowser") ||
        resolvedUrl.includes("?_fb_noscript") ||
        resolvedUrl.includes("/help/") ||
        resolvedUrl.includes("/login/") ||
        resolvedUrl.includes("/checkpoint/")
      ) {
        console.log("🧩 Reason: Detected invalid or non-video page");
        await sendOrEditStatus(
          "⚠️ URL bukan video (foto atau halaman tidak valid) — skip yt-dlp fallback."
        );
        return false;
      }

      // 📁 Pastikan folder output ada
      const outputDir = path.resolve(__dirname, "../../yt-dlp");
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const timestamp = Date.now();
      const basePath = path.join(outputDir, `video_${timestamp}`);
      const outputFile = `${basePath}.mp4`;

      // 🎥 Tentukan command sesuai platform
      let cmd;
      if (isFacebook) {
        cmd = `yt-dlp -o "${basePath}.%(ext)s" "${resolvedUrl}"`;
      } else {
        cmd = `yt-dlp -f "bestvideo+bestaudio/best" --merge-output-format mp4 -o "${basePath}.%(ext)s" "${resolvedUrl}"`;
      }

      console.log("🚀 [ytDlpFallback] Executing command:", cmd);

      // 🚀 Jalankan yt-dlp
      return new Promise((resolve) => {
        exec(cmd, async (error) => {
          if (error) {
            console.error("❌ yt-dlp error:", error.message);
            await sendOrEditStatus(`❌ yt-dlp error: ${error.message}`);
            return resolve(false);
          }

          try {
            await ctx.replyWithVideo(new InputFile(outputFile));
            fs.unlinkSync(outputFile);
            resolve(true);
          } catch (err) {
            console.error("❌ Gagal kirim video:", err.message);
            await sendOrEditStatus(`❌ Gagal kirim video: ${err.message}`);
            fs.unlinkSync(outputFile);
            resolve(false);
          }
        });
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
          createUrl("siputzx", `/api/d/igdl?url=${encodeURIComponent(input)}`),
          { timeout: 8000 }
        );

        const data1 = res1.data;
        if (!data1?.status || !Array.isArray(data1.data))
          throw new Error(
            "API 1 (Siputzx - Instagram) returned invalid response"
          );

        await igHandler1(ctx, chatId, data1);
        await deleteStatus();
        return;
      }

      const res = await getWithTimeout(
        createUrl(
          "siputzx",
          `/api/d/tiktok/v2?url=${encodeURIComponent(input)}`
        ),
        8000 // timeout hanya untuk API
      );

      const data = res.data;
      if (!data?.status || !data?.data)
        throw new Error("API (Siputzx - TikTok) returned invalid response");

      // Proses kirim boleh lama, tidak terpengaruh timeout
      await tthandler1(ctx, chatId, data);
      await deleteStatus();
      return;
    } catch (e1) {
      console.warn("⚠️ API 1 failed:", e1?.message);
      try {
        await sendOrEditStatus("📡 API 1 failed. Trying API 2...");

        if (isFacebook) {
          const res2 = await axios.get(
            createUrl(
              "archive",
              `/api/download/facebook?url=${encodeURIComponent(input)}`
            ),
            {
              timeout: 8000,
            }
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
            createUrl(
              "archive",
              `/api/download/instagram?url=${encodeURIComponent(input)}`
            ),
            {
              timeout: 8000,
            }
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
          createUrl(
            "archive",
            `/api/download/tiktok?url=${encodeURIComponent(input)}`
          ),
          {
            timeout: 8000,
          }
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
            const success = await ytDlpFallback(ctx, input, sendOrEditStatus);

            if (success === false) {
              await deleteStatus();
              return; // Jangan lempar error kalau memang skip foto
            }

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
