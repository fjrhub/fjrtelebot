const { isAuthorized } = require("@/utils/helper");
const axios = require("axios");

module.exports = {
  name: "ss",
  description: "Take website screenshot using Vreden API (with fallback to FAST)",
  async execute(bot, msg) {
    const chatId = msg.chat.id;
    if (!isAuthorized(chatId)) return;

    let input = msg.text?.split(" ").slice(1).join(" ").trim();
    if (!input) {
      return bot.sendMessage(
        chatId,
        "❌ Please provide a website URL.\n\nExample: ss https://example.com",
        { parse_mode: "Markdown" }
      );
    }

    // Auto delete input message
    await bot.deleteMessage(chatId, msg.message_id);

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

    const handleScreenshot = async (buffer) => {
      await bot.sendPhoto(chatId, buffer);
    };

    const screenshotVreden = async (url) => {
      const apiUrl = `${process.env.vreden}/api/ssweb?url=${encodeURIComponent(url)}&type=tablet`;
      const res = await axios.get(apiUrl, { responseType: "arraybuffer", timeout: 10000 });
      if (!res.data) throw new Error("API1 returned empty data.");
      return res.data;
    };

    const screenshotFast = async (url) => {
      if (!/^https?:\/\//i.test(url)) {
        url = `https://${url}`;
      }
      const apiUrl = `${process.env.FAST}/tool/screenshot?url=${encodeURIComponent(url)}&width=1280&height=800&delay=0&fullPage=false&darkMode=false&type=png`;
      const res = await axios.get(apiUrl, { responseType: "arraybuffer", timeout: 10000 });
      if (!res.data) throw new Error("API2 returned empty data.");
      return res.data;
    };

    try {
      await sendOrEditStatus("📡 Trying API1 (Vreden)...");
      const buffer1 = await screenshotVreden(input);
      await handleScreenshot(buffer1);
      await deleteStatus();
      console.log("✅ Primary API (Vreden) success");
    } catch (err1) {
      console.error("❌ API1 failed:", err1.message);

      try {
        await sendOrEditStatus("📡 Trying API2 (FAST)...");
        const buffer2 = await screenshotFast(input);
        await handleScreenshot(buffer2);
        await deleteStatus();
        console.log("✅ Fallback API (FAST) success");
      } catch (err2) {
        console.error("❌ API2 failed:", err2.message);
        await sendOrEditStatus("❌ Failed to take screenshot from both APIs.");
      }
    }
  },
};
