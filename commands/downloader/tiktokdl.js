const { isAuthorized } = require("@/utils/helper");
const axios = require("axios");
require("dotenv").config();

module.exports = {
  name: "tt",
  description: "TikTok downloader",
  async execute(bot, msg, args) {
    const chatId = msg.chat.id;
    if (!isAuthorized(chatId)) return;
    const input = args[0];

    const format = (n) => n?.toLocaleString?.("en-US") || "0";
    const chunkArray = (arr, size) => {
      const result = [];
      for (let i = 0; i < arr.length; i += size) {
        result.push(arr.slice(i, i + size));
      }
      return result;
    };

    const handlerApi1 = async (data) => {
      const statsOnly = `Views: ${format(data.play_count)}
Comments: ${format(data.comment_count)}
Shares: ${format(data.share_count)}
Downloads: ${format(data.download_count)}`;

      if (Array.isArray(data.images) && data.images.length > 0) {
        const chunks = chunkArray(data.images, 10);
        for (let i = 0; i < chunks.length; i++) {
          const mediaGroup = chunks[i].map((url, idx) => ({
            type: "photo",
            media: url,
            ...(i === 0 && idx === 0 ? { caption: statsOnly, parse_mode: "Markdown" } : {}),
          }));
          await bot.sendMediaGroup(chatId, mediaGroup);
        }
        return;
      }

      if (data.play) {
        const caption = `${data.duration > 0 ? `Duration: ${data.duration}s\n` : ""}${statsOnly}`;
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
      const caption = `${data.metadata?.durasi > 0 ? `Duration: ${data.metadata.durasi}s\n` : ""}${statsOnly}`;

      if (Array.isArray(data.media?.image_slide) && data.media.image_slide.length > 0) {
        const chunks = chunkArray(data.media.image_slide, 10);
        for (let i = 0; i < chunks.length; i++) {
          const mediaGroup = chunks[i].map((url, idx) => ({
            type: "photo",
            media: url,
            ...(i === 0 && idx === 0 ? { caption, parse_mode: "Markdown" } : {}),
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
      const caption = `${data.durations > 0 ? `Duration: ${data.durations}s\n` : ""}${statsOnly}`;

      const photos = data.data?.filter((item) => item.type === "photo");
      const video = data.data?.find((item) => item.type === "nowatermark");

      if (photos?.length > 0) {
        const chunks = chunkArray(photos.map(p => p.url), 10);
        for (let i = 0; i < chunks.length; i++) {
          const mediaGroup = chunks[i].map((url, idx) => ({
            type: "photo",
            media: url,
            ...(i === 0 && idx === 0 ? { caption, parse_mode: "Markdown" } : {}),
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

    try {
      const res1 = await axios.get(`${process.env.flowfalcon}/download/tiktok?url=${encodeURIComponent(input)}`, { timeout: 3000 });
      const data1 = res1.data?.result?.data;
      if (!res1.data?.status || !data1) throw new Error("API 1 returned an invalid response.");
      await handlerApi1(data1);
    } catch (e1) {
      console.warn("⚠️ API 1 failed:", e1.message);
      try {
        const res2 = await axios.get(`${process.env.archive}/api/download/tiktok?url=${encodeURIComponent(input)}`, { timeout: 3000 });
        const result = res2.data?.result;
        if (!res2.data?.status || !result?.media) throw new Error("API 2 returned an invalid response.");
        await handlerApi2(result);
      } catch (e2) {
        console.warn("⚠️ API 2 failed:", e2.message);
        try {
          const res3 = await axios.get(`${process.env.vreden}/api/tiktok?url=${encodeURIComponent(input)}`, { timeout: 3000 });
          const result = res3.data?.result;
          if (!res3.data?.status || !result) throw new Error("API 3 returned an invalid response.");
          await handlerApi3(result);
        } catch (e3) {
          console.error("❌ All APIs failed:", e3.message);
          bot.sendMessage(chatId, "❌ All TikTok download APIs failed.");
        }
      }
    }
  }
};
