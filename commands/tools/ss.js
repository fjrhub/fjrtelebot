const axios = require("axios");
const { isAuthorized } = require("@/utils/helper");

module.exports = {
  name: "ss",
  description: "Take website screenshot using Vreden API",
  async execute(bot, msg) {
    const chatId = msg.chat.id;

    if (!isAuthorized(chatId)) return;

    const input = msg.text?.split(" ").slice(1).join(" ").trim();

    if (!input) {
      return bot.sendMessage(chatId, "❌ Please provide a website URL.\n\nExample: `ss https://example.com`", { parse_mode: "Markdown" });
    }

    try {
      const apiUrl = `${process.env.vreden}/api/ssweb?url=${encodeURIComponent(input)}&type=tablet`;

      const res = await axios.get(apiUrl, { responseType: "arraybuffer" });

      await bot.sendPhoto(chatId, res.data);
    } catch (err) {
      console.error(err.message);
      bot.sendMessage(chatId, "⚠️ Failed to take screenshot. Make sure the URL is valid and the API is available.");
    }
  },
};
