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

    const handlerApi1 = async (data) => {
      const videoUrl = data.media?.video_sd;
      const durationMs = parseInt(data.info?.duration || "0");

      if (!videoUrl) throw new Error("SD video is not available.");

      // Convert duration from milliseconds to minutes and seconds
      const totalSeconds = Math.floor(durationMs / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;

      let durationText = "";
      if (minutes > 0) {
        durationText = `${minutes} minute${seconds > 0 ? ` ${seconds}s` : ""}`;
      } else {
        durationText = `${seconds}s`;
      }

      await bot.sendVideo(chatId, videoUrl, {
        caption: "Duration: " + durationText,
      });
    };

    const handlerApi2 = async (data) => {
      const videoUrl = data.media?.[1];

      if (!videoUrl) {
        throw new Error("No video URL found in API 2.");
      }

      await bot.sendVideo(chatId, videoUrl);
    };

    const handlerApi3 = async (data) => {
      const videoUrl = data.sd_url;

      if (!videoUrl) {
        throw new Error("No SD video URL found in API 3.");
      }

      await bot.sendVideo(chatId, videoUrl);
    };

    try {
      const res1 = await axios.get(
        `${process.env.flowfalcon}/download/facebook?url=${encodeURIComponent(
          input
        )}`,
        { timeout: 3000 }
      );
      const data1 = res1.data?.result;
      if (!res1.data?.status || !data1)
        throw new Error("API 1 returned an invalid response.");
      await handlerApi1(data1);
    } catch (e1) {
      console.warn("⚠️ API 1 failed:", e1.message);
      try {
        const res2 = await axios.get(
          `${process.env.archive}/api/download/facebook?url=${encodeURIComponent(
            input
          )}`,
          { timeout: 3000 }
        );
        const result = res2.data?.result;
        if (!res2.data?.status || !result?.media)
          throw new Error("API 2 returned an invalid response.");
        await handlerApi2(result);
      } catch (e2) {
        console.warn("⚠️ API 2 failed:", e2.message);
        try {
          const res3 = await axios.get(
            `${process.env.vreden}/api/fbdl?url=${encodeURIComponent(input)}`,
            { timeout: 20000 }
          )
          const result = res3.data?.data;
          if (!result?.status || !result?.sd_url)
            throw new Error("API 3 returned an invalid response.");
          await handlerApi3(result);
        } catch (e3) {
          console.error("❌ All APIs failed:", e3.message);
          bot.sendMessage(chatId, "❌ All Facebook download APIs failed.");
        }
      }
    }
  },
};
