const { isAutoEnabled } = require("@/utils/supabase");
const { isAuthorized } = require("@/utils/helper");
const axios = require("axios");

module.exports = {
  name: "auto",
  async execute(bot, msg) {
    const chatId = msg.chat.id;
    if (!isAuthorized(chatId)) return;
    const text = msg.text;

    const tiktokRegex =
      /(?:http(?:s)?:\/\/)?(?:www\.|vt\.)?tiktok\.com\/[^\s]+/i;
    if (!text || !tiktokRegex.test(text)) return;

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

    try {
      await sendOrEditStatus("📡 Trying API 1...");
      const res1 = await axios.get(
        `${process.env.flowfalcon}/download/tiktok?url=${encodeURIComponent(
          input
        )}`,
        { timeout: 8000 }
      );
      const data1 = res1.data?.result?.data;
      if (!res1.data?.status || !data1)
        throw new Error("API 1 returned an invalid response.");
      await handlerApi1(data1);
      await deleteStatus();
    } catch (e) {
      console.error("❌ API 1 failed:", e.message);
      try {
        await sendOrEditStatus("📡 API 1 failed. Trying API 2...");
        const res2 = await axios.get(
          `${process.env.archive}/api/download/tiktok?url=${encodeURIComponent(
            input
          )}`,
          { timeout: 8000 }
        );
        const result2 = res2.data?.result;
        if (!res2.data?.status || !result2?.media)
          throw new Error("API 2 returned an invalid response.");
        await handlerApi2(result2);
        await deleteStatus();
      } catch (e2) {
        console.warn("⚠️ API 2 failed:", e2.message);
        try {
          await sendOrEditStatus("📡 API 2 failed. Trying API 3...");
          const res3 = await axios.get(
            `${process.env.vreden}/api/tiktok?url=${encodeURIComponent(input)}`,
            { timeout: 8000 }
          );
          const result3 = res3.data?.result;
          if (!res3.data?.status || !result3)
            throw new Error("API 3 returned an invalid response.");
          await handlerApi3(result3);
          await deleteStatus();
        } catch (e3) {
          console.error("❌ All APIs failed:", e3.message);
          await sendOrEditStatus("❌ All TikTok download APIs failed.");
        }
      }
    }
  },
};
