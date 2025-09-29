const axios = require("axios");
const { isAuthorized } = require("@/utils/helper");

// store active word scramble games per chat
const activeWordScramble = {};

module.exports = {
  name: "susunkata",
  description: "Word scramble game",
  async execute(bot, msg) {
    const chatId = msg.chat.id;
    const text = (msg.text || "").trim().toLowerCase();
    if (!isAuthorized(chatId)) return;

    // 🔑 handle surrender
    if (text === "/susunkata surrender") {
      if (!activeWordScramble[chatId]) {
        return bot.sendMessage(chatId, "⚠️ No Word Scramble game is currently running in this chat.");
      }

      const { answer } = activeWordScramble[chatId];
      await bot.sendMessage(
        chatId,
        `🏳️ Game ended. The correct answer was *${answer}*`,
        { parse_mode: "Markdown" }
      );

      delete activeWordScramble[chatId];
      return;
    }

    // prevent multiple games at once
    if (activeWordScramble[chatId]) {
      return bot.sendMessage(
        chatId,
        "⚠️ A Word Scramble game is already running in this chat. Please finish it or surrender first."
      );
    }

    try {
      const res = await axios.get(
        `${process.env.siputzx}/api/games/susunkata`,
        { timeout: 8000 }
      );

      const result = res.data;
      if (result?.status && result.data) {
        const question = result.data.soal;
        const answer = result.data.jawaban;
        const type = result.data.tipe;

        activeWordScramble[chatId] = { answer };

        await bot.sendMessage(
          chatId,
          `🔤 *Unscramble the letters:*\n\n${question}\n\n📌 Hint: *${type}*`,
          { parse_mode: "Markdown" }
        );

        // listener for answers
        const listener = async (answerMsg) => {
          if (answerMsg.chat.id !== chatId) return;
          if (!answerMsg.text) return;

          const userAnswer = answerMsg.text.trim().toLowerCase();
          const correctAnswer = answer.toLowerCase();

          if (userAnswer === correctAnswer) {
            await bot.sendMessage(
              chatId,
              `✅ Correct! ${answerMsg.from.first_name} solved it!\nThe answer is *${answer}*`,
              { parse_mode: "Markdown" }
            );

            delete activeWordScramble[chatId];
            bot.removeListener("message", listener);
          }
        };

        bot.on("message", listener);
      } else {
        bot.sendMessage(chatId, "⚠️ Failed to fetch Word Scramble question from the API.");
      }
    } catch (error) {
      console.error("Word Scramble Error:", error.message);
      bot.sendMessage(chatId, "❌ An error occurred while fetching the question.");
    }
  },
};
