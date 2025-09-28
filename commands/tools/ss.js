const { isAuthorized } = require("@/utils/helper");
const axios = require("axios");

module.exports = {
  name: "ss",
  description: "Take website screenshot using Vreden API (with fallback)",
  async execute(bot, msg) {
    const chatId = msg.chat.id;
    if (!isAuthorized(chatId)) return;

    const input = msg.text?.split(" ").slice(1).join(" ").trim();

    if (!input) {
      return bot.sendMessage(
        chatId,
        "❌ Please provide a website URL.\n\nExample: `ss https://example.com`",
        { parse_mode: "Markdown" }
      );
    }

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

    try {
      // API 1 → Vreden
      await sendOrEditStatus("📡 Trying API 1 (Vreden)...");
      const apiUrl1 = `${process.env.a}/api/ssweb?url=${encodeURIComponent(input)}&type=tablet`;

      const res1 = await axios.get(apiUrl1, { responseType: "arraybuffer", timeout: 10000 });
      if (!res1.data) throw new Error("API 1 returned empty data.");

      await handleScreenshot(res1.data);
      await deleteStatus();
      console.log("✅ Primary API (Vreden) success");

    } catch (err1) {
      console.error("❌ API 1 failed:", err1.message);

      try {
        // API 2 → FAST
        await sendOrEditStatus("📡 Trying API 2 (FAST)...");
        const apiUrl2 = `${process.env.FAST}/tool/screenshot?url=${encodeURIComponent(input)}&width=1280&height=800&delay=0&fullPage=false&darkMode=false&type=png`;

        const res2 = await axios.get(apiUrl2, { responseType: "arraybuffer", timeout: 10000 });
        if (!res2.data) throw new Error("API 2 returned empty data.");

        await handleScreenshot(res2.data);
        await deleteStatus();
        console.log("✅ Fallback API (FAST) success");

      } catch (err2) {
        console.error("❌ API 2 failed:", err2.message);
        await sendOrEditStatus("❌ Failed to take screenshot from both APIs.");
      }
    }
  },
};
