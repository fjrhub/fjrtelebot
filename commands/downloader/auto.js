const { isAutoEnabled } = require("@/utils/supabase");
const { isAuthorized } = require("@/utils/helper");
const axios = require("axios");

module.exports = {
  name: "auto",
  async execute(bot, msg) {
    const chatId = msg.chat.id;
    if (!isAuthorized(chatId)) return;

    const text = msg.text;
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

    await bot.deleteMessage(chatId, msg.message_id);

    const input = text;
    let statusMessage = null;

    const sendOrEditStatus = async (text) => {
      if (!statusMessage) {
        statusMessage = await bot.sendMessage(chatId, text);
      } else {
        await bot.editMessageText(text, {
          chat_id: chatId,
          message_id: statusMessage.message_id,
        });
      }
    };

    const deleteStatus = async () => {
      if (statusMessage) {
        await new Promise((res) => setTimeout(res, 1000));
        await bot.deleteMessage(chatId, statusMessage.message_id);
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

    const handlerApi1 = async (data) => {
      const statsOnly = `Views: ${data.stats?.play || "0"}\nComments: ${
        data.stats?.comment || "0"
      }\nShares: ${data.stats?.share || "0"}`;

      if (Array.isArray(data.images) && data.images.length > 0) {
        const chunks = chunkArray(data.images, 10);
        for (let i = 0; i < chunks.length; i++) {
          const mediaGroup = chunks[i].map((url, idx) => ({
            type: "photo",
            media: url,
            ...(i === 0 && idx === 0
              ? { caption: statsOnly, parse_mode: "Markdown" }
              : {}),
          }));
          await bot.sendMediaGroup(chatId, mediaGroup);
        }
        return;
      }

      if (data.videoUrl) {
        await bot.sendVideo(chatId, data.videoUrl, {
          caption: statsOnly,
          parse_mode: "Markdown",
          supports_streaming: true,
        });
        return;
      }

      throw new Error("API 1 returned no valid downloadable content.");
    };

    const handlerApi2 = async (data) => {
      const statsOnly = `Views: ${format(data.metadata?.view)}
Comments: ${format(data.metadata?.comment)}
Shares: ${format(data.metadata?.share)}
Downloads: ${format(data.metadata?.download)}`;
      const caption = `${
        data.metadata?.durasi > 0 ? `Duration: ${data.metadata.durasi}s\n` : ""
      }${statsOnly}`;

      if (
        Array.isArray(data.media?.image_slide) &&
        data.media.image_slide.length > 0
      ) {
        const chunks = chunkArray(data.media.image_slide, 10);
        for (let i = 0; i < chunks.length; i++) {
          const mediaGroup = chunks[i].map((url, idx) => ({
            type: "photo",
            media: url,
            ...(i === 0 && idx === 0
              ? { caption, parse_mode: "Markdown" }
              : {}),
          }));
          await bot.sendMediaGroup(chatId, mediaGroup);
        }
        return;
      }

      if (data.media?.play && data.metadata?.durasi > 0) {
        await bot.sendVideo(chatId, data.media.play, {
          caption,
          parse_mode: "Markdown",
          supports_streaming: true,
        });
        return;
      }

      throw new Error("API 2 returned no valid downloadable content.");
    };

    const handlerApi3 = async (data) => {
      const statsOnly = `Views: ${data.stats?.views || "?"}
Comments: ${data.stats?.comment || "?"}
Shares: ${data.stats?.share || "?"}
Downloads: ${data.stats?.download || "?"}`;
      const caption = `${
        data.durations > 0 ? `Duration: ${data.durations}s\n` : ""
      }${statsOnly}`;

      const photos = data.data?.filter((item) => item.type === "photo");
      const video = data.data?.find((item) => item.type === "nowatermark");

      if (photos?.length > 0) {
        const chunks = chunkArray(
          photos.map((p) => p.url),
          10
        );
        for (let i = 0; i < chunks.length; i++) {
          const mediaGroup = chunks[i].map((url, idx) => ({
            type: "photo",
            media: url,
            ...(i === 0 && idx === 0
              ? { caption, parse_mode: "Markdown" }
              : {}),
          }));
          await bot.sendMediaGroup(chatId, mediaGroup);
        }
        return;
      }

      if (video?.url && data.durations > 0) {
        await bot.sendVideo(chatId, video.url, {
          caption,
          parse_mode: "Markdown",
          supports_streaming: true,
        });
        return;
      }

      throw new Error("API 3 returned no valid downloadable content.");
    };

    const fbHandler1 = async (data) => {
      const hdMp4Video = data.data?.find(
        (item) => item.format === "mp4" && item.resolution === "HD"
      );

      if (!hdMp4Video?.url) {
        throw new Error("HD MP4 video URL is not available.");
      }
      const videoUrl = hdMp4Video.url;
      await bot.sendVideo(chatId, videoUrl);
    };

    const fbHandler2 = async (data) => {
      const videoUrl = data.media?.[2];
      if (!videoUrl) throw new Error("No HD video URL found in API 2.");
      await bot.sendVideo(chatId, videoUrl);
    };

    const fbHandler3 = async (data) => {
      const videoUrl = data.hd_url;
      if (!videoUrl) throw new Error("No HD video URL found in API 3.");
      await bot.sendVideo(chatId, videoUrl);
    };

    const igHandler1 = async (input, bot, chatId) => {
      const result = input?.result;
      const urls = Array.isArray(result?.downloadUrl) ? result.downloadUrl : [];

      if (urls.length === 0 || !result?.metadata) {
        throw new Error("IG API 1 returned invalid or empty media.");
      }

      const isVideo = result.metadata.isVideo;

      if (isVideo) {
        const videoUrl =
          urls.find((url) => url && url.endsWith(".mp4")) || urls[0];
        if (!videoUrl) throw new Error("No valid video URL found.");
        await bot.sendVideo(chatId, videoUrl);
        return;
      }

      const photoUrls = urls.filter((url) => url);

      if (photoUrls.length) {
        const mediaGroup = photoUrls.slice(0, 10).map((img) => ({
          type: "photo",
          media: img,
        }));
        await bot.sendMediaGroup(chatId, mediaGroup);
        return;
      }

      throw new Error(
        "IG API 1 returned unsupported media type or no valid URLs."
      );
    };

    const igHandler2 = async (data) => {
      const result = data.result || {};
      const mediaUrls = result.url || [];
      const isVideo = result.isVideo;
      const caption = `${format(result.like)} Likes`;

      if (isVideo && mediaUrls.length > 0) {
        await bot.sendVideo(chatId, mediaUrls[0], {
          caption,
          parse_mode: "Markdown",
          supports_streaming: true,
        });
        return;
      }

      if (!isVideo && mediaUrls.length > 0) {
        const chunks = chunkArray(mediaUrls, 10);
        for (let i = 0; i < chunks.length; i++) {
          const mediaGroup = chunks[i].map((url, idx) => ({
            type: "photo",
            media: url,
            ...(i === 0 && idx === 0
              ? { caption, parse_mode: "Markdown" }
              : {}),
          }));
          await bot.sendMediaGroup(chatId, mediaGroup);
        }
        return;
      }

      throw new Error("IG API 2 returned no valid media.");
    };

    const igHandler3 = async (data) => {
      const mediaItems = Array.isArray(data?.result?.response?.data)
        ? data.result.response.data
        : [];

      if (mediaItems.length === 0) {
        throw new Error("IG API 3 returned empty media array.");
      }

      const images = mediaItems.filter((i) => i.type === "image");
      const videos = mediaItems.filter((i) => i.type === "video");

      if (videos.length > 0) {
        await bot.sendVideo(chatId, videos[0].url, {
          supports_streaming: true,
        });
        return;
      }

      if (images.length > 0) {
        const mediaUrls = images.map((i) => i.url);
        const chunks = chunkArray(mediaUrls, 10);

        for (let i = 0; i < chunks.length; i++) {
          const mediaGroup = chunks[i].map((url) => ({
            type: "photo",
            media: url,
          }));
          await bot.sendMediaGroup(chatId, mediaGroup);
        }

        return;
      }
      throw new Error("IG API 3 returned unsupported media.");
    };

    try {
      await sendOrEditStatus("📡 Trying API 1...");

      if (isFacebook) {
        const res1 = await axios.get(
          `${process.env.siputzx}/api/d/facebook?url=${encodeURIComponent(
            input
          )}`
        );

        const data1 = res1.data?.data;

        if (!res1.data?.status || !data1 || !Array.isArray(data1.data)) {
          throw new Error(
            "API 1 (Siputzx - Facebook) returned an invalid response."
          );
        }

        await fbHandler1(data1);
        await deleteStatus();
        return;
      }

      if (isInstagram) {
        const res1 = await axios.get(
          `${
            process.env.nekorinn
          }/downloader/instagram?url=${encodeURIComponent(input)}`,
          { timeout: 8000 }
        );
        const data1 = res1.data;

        if (
          !data1?.status ||
          !data1.result ||
          !Array.isArray(data1.result.downloadUrl) ||
          data1.result.downloadUrl.length === 0
        )
          throw new Error(
            "API 1 (Nekorinn - Instagram) returned an invalid response."
          );

        await igHandler1(data1, bot, chatId);
        await deleteStatus();
        return;
      }

      // throw new Error("Skipping TikTok API 1");

      const res1 = await axios.get(
        `${process.env.nekorinn}/downloader/tikwm?url=${encodeURIComponent(
          input
        )}`,
        { timeout: 8000 }
      );
      const data1 = res1.data?.result;
      await handlerApi1(data1);
      await deleteStatus();
    } catch (e1) {
      console.warn("⚠️ API 1 failed:", e1.message);
      try {
        await sendOrEditStatus("📡 API 1 failed. Trying API 2...");

        if (isFacebook) {
          const res2 = await axios.get(
            `${
              process.env.archive
            }/api/download/facebook?url=${encodeURIComponent(input)}`,
            { timeout: 8000 }
          );
          const result2 = res2.data?.result;
          if (!res2.data?.status || !result2?.media)
            throw new Error(
              "API 2 (Archive - Facebook) returned an invalid response."
            );
          await fbHandler2(result2);
          await deleteStatus();
          return;
        }

        if (isInstagram) {
          const res2 = await axios.get(
            `${
              process.env.archive
            }/api/download/instagram?url=${encodeURIComponent(input)}`,
            { timeout: 8000 }
          );
          const data2 = res2.data;
          if (!data2?.status || !data2.result?.url?.length)
            throw new Error(
              "API 2 (Archive - Instagram) returned an invalid response."
            );
          await igHandler2(data2);
          await deleteStatus();
          return;
        }

        const res2 = await axios.get(
          `${process.env.archive}/api/download/tiktok?url=${encodeURIComponent(
            input
          )}`,
          { timeout: 8000 }
        );
        const result2 = res2.data?.result;
        if (!res2.data?.status || !result2?.media)
          throw new Error(
            "API 2 (Archive - Tiktok) returned an invalid response."
          );
        await handlerApi2(result2);
        await deleteStatus();
      } catch (e2) {
        console.warn("⚠️ API 2 failed:", e2.message);
        try {
          await sendOrEditStatus("📡 API 2 failed. Trying API 3...");

          if (isFacebook) {
            const res3 = await axios.get(
              `${process.env.vreden}/api/fbdl?url=${encodeURIComponent(input)}`,
              { timeout: 8000 }
            );
            const result3 = res3.data?.data;
            if (!result3?.status || !result3?.sd_url)
              throw new Error(
                "API 3 (Vreden - Facebook) returned an invalid response."
              );
            await fbHandler3(result3);
            await deleteStatus();
            return;
          }

          if (isInstagram) {
            const res3 = await axios.get(
              `${process.env.vreden}/api/igdownload?url=${encodeURIComponent(
                input
              )}`,
              { timeout: 8000 }
            );
            const data3 = res3.data;

            if (data3?.status !== 200 || !data3?.result?.response?.status)
              throw new Error(
                "API 3 (Vreden - Instagram) returned an invalid response."
              );
            await igHandler3(data3);
            await deleteStatus();
            return;
          }

          const res3 = await axios.get(
            `${process.env.vreden}/api/tiktok?url=${encodeURIComponent(input)}`,
            { timeout: 8000 }
          );
          const result3 = res3.data?.result;
          if (!res3.data?.status || !result3)
            throw new Error(
              "API 3 (Vreden - Tiktok) returned an invalid response."
            );
          await handlerApi3(result3);
          await deleteStatus();
        } catch (e3) {
          console.error("❌ All APIs failed:", e3.message);
          await sendOrEditStatus(
            `❌ All ${
              isFacebook ? "Facebook" : isInstagram ? "Instagram" : "TikTok"
            } download APIs failed.`
          );
        }
      }
    }
  },
};
