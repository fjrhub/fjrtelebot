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
      /(?:http(?:s)?:\/\/)?(?:www\.|vt\.)?tiktok\.com\/[^\s]+/i;
    const instagramRegex =
      /(?:http(?:s)?:\/\/)?(?:www\.)?instagram\.com\/(reel|p|tv)\/[A-Za-z0-9_-]+/i;
    const facebookRegex =
      /(?:http(?:s)?:\/\/)?(?:www\.)?facebook\.com\/(?:share\/r\/|reel\/|watch\?v=|permalink\.php\?story_fbid=|[^\/]+\/posts\/|video\.php\?v=)[^\s]+/i;

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
      const statsOnly = `Views: ${format(data.play_count)}\nComments: ${format(
        data.comment_count
      )}\nShares: ${format(data.share_count)}\nDownloads: ${format(
        data.download_count
      )}`;

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

      if (data.play) {
        const caption = `${
          data.duration > 0 ? `Duration: ${data.duration}s\n` : ""
        }${statsOnly}`;
        await bot.sendVideo(chatId, data.play, {
          caption,
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
      const videoUrl = data.media?.video_sd;
      const durationMs = parseInt(data.info?.duration || "0");
      if (!videoUrl) throw new Error("SD video is not available.");
      const totalSeconds = Math.floor(durationMs / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const durationText =
        minutes > 0
          ? `${minutes} minute${seconds > 0 ? ` ${seconds}s` : ""}`
          : `${seconds}s`;
      await bot.sendVideo(chatId, videoUrl, {
        caption: "Duration: " + durationText,
      });
    };

    const fbHandler2 = async (data) => {
      const videoUrl = data.media?.[1];
      if (!videoUrl) throw new Error("No video URL found in API 2.");
      await bot.sendVideo(chatId, videoUrl);
    };

    const fbHandler3 = async (data) => {
      const videoUrl = data.sd_url;
      if (!videoUrl) throw new Error("No SD video URL found in API 3.");
      await bot.sendVideo(chatId, videoUrl);
    };

    const igHandler1 = async (input, bot, chatId) => {
      const mediaItems = Array.isArray(input)
        ? input
        : Array.isArray(input?.data)
        ? input.data
        : [];

      if (mediaItems.length === 0) {
        throw new Error("IG API 1 returned empty media array.");
      }

      const images = mediaItems.filter((i) => i.type === "image");
      const videos = mediaItems.filter((i) => i.type === "video");

      if (videos.length) {
        await bot.sendVideo(chatId, videos[0].url);
        return;
      }

      if (images.length) {
        const mediaGroup = images.slice(0, 10).map((img) => ({
          type: "photo",
          media: img.url,
        }));

        await bot.sendMediaGroup(chatId, mediaGroup);
        return;
      }

      throw new Error("IG API 1 returned unsupported media.");
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
          `${process.env.flowfalcon}/download/facebook?url=${encodeURIComponent(
            input
          )}`,
          { timeout: 8000 }
        );
        const data1 = res1.data?.result;
        if (!res1.data?.status || !data1)
          throw new Error("API 1 returned an invalid response.");
        await fbHandler1(data1);
        await deleteStatus();
        return;
      }

      if (isInstagram) {
        const res1 = await axios.get(
          `${process.env.vapis}/api/igdl?url=${encodeURIComponent(input)}`,
          { timeout: 8000 }
        );
        const data1 = res1.data;
        if (
          !data1?.status ||
          !Array.isArray(data1.data) ||
          data1.data.length === 0
        )
          throw new Error("IG API 1 returned an invalid response.");

        await igHandler1(data1, bot, chatId);
        await deleteStatus();
        return;
      }

      const res1 = await axios.get(
        `${process.env.flowfalcon}/download/tiktok?url=${encodeURIComponent(
          input
        )}`,
        { timeout: 8000 }
      );
      const data1 = res1.data?.result?.data;
      if (!res1.data?.status || !data1)
        throw new Error("TikTok API 1 returned an invalid response.");
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
            throw new Error("API 2 returned an invalid response.");
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
            throw new Error("IG API 2 returned an invalid response.");
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
          throw new Error("TikTok API 2 returned an invalid response.");
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
              throw new Error("API 3 returned an invalid response.");
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
              throw new Error("IG API 3 returned an invalid response.");

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
            throw new Error("TikTok API 3 returned an invalid response.");
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
