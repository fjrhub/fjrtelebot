const axios = require("axios");
const { isAuthorized } = require("@/utils/helper");

module.exports = {
  name: "asahotak",
  description: "Brain teaser quiz game",
  async execute(bot, msg) {
    const chatId = msg.chat.id;
    if (!isAuthorized(chatId)) return;

    try {
      const { data } = await axios.get(
        `${process.env.siputzx}/api/games/asahotak`,
        { timeout: 8000 }
      );

      if (!data?.status) {
        return bot.sendMessage(chatId, "⚠️ Failed to fetch Brain Teaser question.");
      }

      const question = data.data?.soal;
      const answer = data.data?.jawaban;

      if (!question || !answer) {
        return bot.sendMessage(chatId, "⚠️ Invalid Brain Teaser data received.");
      }

      // Save current game state for this chat
      bot.currentGames = bot.currentGames || {};
      bot.currentGames[chatId] = {
        type: "asahotak",
        answer: answer.toLowerCase(),
      };

      await bot.sendMessage(
        chatId,
        question,
        { parse_mode: "Markdown" }
      );
    } catch (err) {
      console.error("Asah Otak Error:", err.message);
      return bot.sendMessage(chatId, "⚠️ Error fetching Brain Teaser question.");
    }
  },
};
