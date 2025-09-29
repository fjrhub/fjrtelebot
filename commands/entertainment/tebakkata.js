const axios = require("axios");
const { isAuthorized } = require("@/utils/helper");

// store active word guessing games per chat
const activeWordGuess = {};

module.exports = {
  name: "tebakkata",
  description: "Word guessing game",
  async execute(bot, msg) {
    const chatId = msg.chat.id;
    const text = (msg.text || "").trim().toLowerCase();
    if (!isAuthorized(chatId)) return;

    // 🔑 handle surrender
    if (text === "/tebakkata surrender") {
      if (!activeWordGuess[chatId]) {
        return bot.sendMessage(chatId, "⚠️ No Word Guess game is currently running in this chat.");
      }

      const { answer } = activeWordGuess[chatId];
      await bot.sendMessage(
        chatId,
        `🏳️ Game ended. The correct word was *${answer}*`,
        { parse_mode: "Markdown" }
      );

      delete activeWordGuess[chatId];
      return;
    }

    // prevent multiple games at once
    if (activeWordGuess[chatId]) {
      return bot.sendMessage(
        chatId,
        "⚠️ A Word Guess game is already running in this chat. Please finish it or surrender first."
      );
    }

    try {
      const res = await axios.get(
        `${process.env.siputzx}/api/games/tebakkata`,
        { timeout: 8000 }
      );

      const result = res.data;
      if (result?.status && result.data) {
        const question = result.data.soal;
        const answer = result.data.jawaban;

        activeWordGuess[chatId] = { answer };

        await bot.sendMessage(
          chatId,
          `🧩 *Guess the word from these clues:*\n\n${question}`,
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
              `✅ Correct! ${answerMsg.from.first_name} got it right!\nThe word is *${answer}*`,
              { parse_mode: "Markdown" }
            );

            delete activeWordGuess[chatId];
            bot.removeListener("message", listener);
          }
        };

        bot.on("message", listener);
      } else {
        bot.sendMessage(chatId, "⚠️ Failed to fetch Word Guess question from the API.");
      }
    } catch (error) {
      console.error("Word Guess Error:", error.message);
      bot.sendMessage(chatId, "❌ An error occurred while fetching the question.");
    }
  },
};
