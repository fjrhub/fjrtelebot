const { isAutoEnabled } = require("@/utils/supabase");
const { isAuthorized } = require("@/utils/helper");
const axios = require("axios");

module.exports = {
  name: "auto",
  async execute(bot, msg) {
    const chatId = msg.chat.id;
    if (!isAuthorized(chatId)) return;
    const text = msg.text;

    const tiktokRegex = /(?:http(?:s)?:\/\/)?(?:www\.|vt\.)?tiktok\.com\/[^\s]+/i;
    if (!text || !tiktokRegex.test(text)) return;

    const isAuto = await isAutoEnabled(chatId);
    if (!isAuto) return;

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
      const statsOnly = `Views: ${format(data.play_count)}\nComments: ${format(data.comment_count)}\nShares: ${format(data.share_count)}\nDownloads: ${format(data.download_count)}`;

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

    try {
      await sendOrEditStatus("📡 Trying API 1...");
      const res1 = await axios.get(
        `${process.env.flowfalcon}/download/tiktok?url=${encodeURIComponent(input)}`,
        { timeout: 8000 }
      );
      const data1 = res1.data?.result?.data;
      if (!res1.data?.status || !data1)
        throw new Error("API 1 returned an invalid response.");
      await handlerApi1(data1);
      await deleteStatus();
    } catch (e) {
      console.error("❌ API 1 failed:", e.message);
      await sendOrEditStatus("❌ TikTok download failed.");
    }
  },
};