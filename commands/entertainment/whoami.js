const axios = require("axios");
const { privat } = require("@/utils/helper");

module.exports = {
  name: "whoami",
  description: "Who Am I guessing game",
  async execute(bot, msg) {
    const chatId = msg.chat.id;

    if (!privat(chatId)) return;

    try {
      const res = await axios.get(
        `${process.env.siputzx}/api/games/siapakahaku`,
        { timeout: 8000 }
      );

      const result = res.data;

      if (result?.status && result.data) {
        const question = result.data.soal;
        const answer = result.data.jawaban;

        await bot.sendMessage(
          chatId,
          `🤔 *Who Am I?*\n\n${question}\n\nType your answer in this chat!`,
          { parse_mode: "Markdown" }
        );

        const userId = msg.from.id;

        const listener = async (answerMsg) => {
          if (answerMsg.chat.id !== chatId || answerMsg.from.id !== userId) return;

          if (!answerMsg.text) return;

          if (answerMsg.text.trim().toLowerCase() === answer.toLowerCase()) {
            await bot.sendMessage(chatId, `✅ Correct! The answer is *${answer}*`, {
              parse_mode: "Markdown",
            });
          } else {
            await bot.sendMessage(chatId, `❌ Wrong! The correct answer is *${answer}*`, {
              parse_mode: "Markdown",
            });
          }

          bot.removeListener("message", listener);
        };

        bot.on("message", listener);
      } else {
        bot.sendMessage(chatId, "⚠️ Failed to fetch the question from the API.");
      }
    } catch (error) {
      console.error(error);
      bot.sendMessage(chatId, "❌ An error occurred while fetching the question.");
    }
  },
};
