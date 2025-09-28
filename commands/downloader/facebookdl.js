const { isAuthorized } = require("@/utils/helper");
const axios = require("axios");
require("dotenv").config();

module.exports = {
  name: "fb",
  description: "Facebook downloader",
  async execute(bot, msg, args) {
    const chatId = msg.chat.id;
    if (!isAuthorized(chatId)) return;
    const input = args[0];
    let statusMessage = null;

    if (!input || !input.startsWith("https")) {
      return bot.sendMessage(
        chatId,
        "❌ Please provide a valid Facebook URL.",
        { parse_mode: "Markdown" }
      );
    }

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
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await bot.deleteMessage(chatId, statusMessage.message_id);
        statusMessage = null;
      }
    };

    const handlerApi1 = async (data) => {
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

    const handlerApi2 = async (data) => {
      const videoUrl = data.media?.[1];
      if (!videoUrl) throw new Error("No video URL found in API 2.");
      await bot.sendVideo(chatId, videoUrl);
    };

    const handlerApi3 = async (data) => {
      const videoUrl = data.sd_url;
      if (!videoUrl) throw new Error("No SD video URL found in API 3.");
      await bot.sendVideo(chatId, videoUrl);
    };

    try {
      await sendOrEditStatus("📡 Trying API 1...");
      const res1 = await axios.get(
        `${process.env.flowfalcon}/download/facebook?url=${encodeURIComponent(
          input
        )}`,
        { timeout: 5000 }
      );
      const data1 = res1.data?.result;
      if (!res1.data?.status || !data1)
        throw new Error("API 1 returned an invalid response.");
      await handlerApi1(data1);
      await deleteStatus();
    } catch (e1) {
      console.warn("⚠️ API 1 failed:", e1.message);
      try {
        await sendOrEditStatus("📡 API 1 failed. Trying API 2...");
        const res2 = await axios.get(
          `${
            process.env.archive
          }/api/download/facebook?url=${encodeURIComponent(input)}`,
          { timeout: 5000 }
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
            `${process.env.vreden}/api/fbdl?url=${encodeURIComponent(input)}`,
            { timeout: 10000 }
          );
          const result3 = res3.data?.data;
          if (!result3?.status || !result3?.sd_url)
            throw new Error("API 3 returned an invalid response.");
          await handlerApi3(result3);
          await deleteStatus();
        } catch (e3) {
          console.error("❌ All APIs failed:", e3.message);
          await sendOrEditStatus("❌ All Facebook download APIs failed.");
        }
      }
    }
  },
};
