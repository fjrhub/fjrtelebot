const { isAuthorized } = require("@/utils/helper");
const axios = require("axios");

module.exports = {
  name: "waifu",
  description: "Get a random waifu image from two fallback APIs",
  async execute(bot, msg) {
    const chatId = msg.chat.id;
    if (!isAuthorized(chatId)) return;

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

    const handleWaifuPics = async (url) => {
      await bot.sendPhoto(chatId, url);
      console.log("✅ Primary API (WaifuPics) success");
    };

    const handleWaifuIm = async (url) => {
      await bot.sendPhoto(chatId, url);
      console.log("✅ Fallback API (WaifuIM) success");
    };

    try {
      // API 1 → WaifuPics
      await sendOrEditStatus("📡 Trying API 1 (WaifuPics)...");
      const res1 = await axios.get(`${process.env.waifupics}/sfw/waifu`, { timeout: 8000 });
      const imageUrl1 = res1.data?.url;
      if (!imageUrl1) throw new Error("API 1 returned an invalid response.");

      await handleWaifuPics(imageUrl1);
      await deleteStatus();

    } catch (err1) {
      console.error("❌ API 1 failed:", err1.message);

      try {
        // API 2 → WaifuIM
        await sendOrEditStatus("📡 Trying API 2 (WaifuIM)...");
        const res2 = await axios.get(`${process.env.waifuim}/search?included_tags=waifu`, { timeout: 8000 });
        const imageUrl2 = res2.data?.images?.[0]?.url;
        if (!imageUrl2) throw new Error("API 2 returned an invalid response.");

        await handleWaifuIm(imageUrl2);
        await deleteStatus();

      } catch (err2) {
        console.error("❌ API 2 failed:", err2.message);
        await sendOrEditStatus("❌ Failed to fetch images from both APIs.");
      }
    }
  },
};
