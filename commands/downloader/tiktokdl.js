const { privat } = require("@/utils/helper");
const axios = require("axios");
require("dotenv").config();

module.exports = {
  name: "tt",
  description: "tiktok downloader",
  async execute(bot, msg, args) {
    const chatId = msg.chat.id;
    if (!privat(chatId)) return;
    const input = args[0];

    const format = (n) => n?.toLocaleString() || "0";
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
            ...(i === 0 && idx === 0
              ? { caption: statsOnly, parse_mode: "Markdown" }
              : {}),
          }));
          await bot.sendMediaGroup(chatId, mediaGroup);
        }
        return;
      }

      if (data.play) {
        const durationLine =
          data.duration && data.duration > 0
            ? `Duration: ${data.duration}s\n`
            : "";
        const caption = `${durationLine}${statsOnly}`;
        await bot.sendVideo(chatId, data.play, {
          caption,
          parse_mode: "Markdown",
          supports_streaming: true,
        });
        return;
      }

      await bot.sendMessage(
        chatId,
        "❌ No downloadable content found (API 1)."
      );
    };

    const handlerApi2 = async (data) => {
      const format = (n) => n?.toLocaleString() || "0";
      const statsOnly = `Views: ${format(data.metadata?.view)}
Comments: ${format(data.metadata?.comment)}
Shares: ${format(data.metadata?.share)}
Downloads: ${format(data.metadata?.download)}`;

      const durationLine =
        data.metadata?.durasi && data.metadata.durasi > 0
          ? `Duration: ${data.metadata.durasi}s\n`
          : "";

      const caption = `${durationLine}${statsOnly}`;

      if (
        Array.isArray(data.media?.image_slide) &&
        data.media.image_slide.length > 0
      ) {
        const chunkArray = (arr, size) => {
          const result = [];
          for (let i = 0; i < arr.length; i += size) {
            result.push(arr.slice(i, i + size));
          }
          return result;
        };

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

      await bot.sendMessage(
        chatId,
        "❌ No valid content to download from API 2."
      );
    };

    try {
      const res1 = await axios.get(
        `${process.env.agatz}/download/tiktok?url=${encodeURIComponent(input)}`
      );
      const data1 = res1.data?.result?.data;
      if (!res1.data?.status || !data1)
        throw new Error("response API 1 invalid");
      await handlerApi1(data1);
    } catch (e1) {
      console.warn("⚠️ API 1 failed, try the 2nd API ...");
      try {
        const res2 = await axios.get(
          `${process.env.archive}/api/download/tiktok?url=${encodeURIComponent(
            input
          )}`
        );
        const result = res2.data?.result;
        if (!res2.data?.status || !result?.media?.play)
          throw new Error("API response 2 invalid");
        await handlerApi2(result);
      } catch (e2) {
        console.error("❌ All API failed:", e2.message);
        bot.sendMessage(chatId, "❌ All API failed.");
      }
    }
  },
};
