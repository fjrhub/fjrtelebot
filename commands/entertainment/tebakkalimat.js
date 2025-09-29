const axios = require("axios");
const { isAuthorized } = require("@/utils/helper");

// store active sentence guessing games per chat
const activeSentenceGuess = {};

module.exports = {
  name: "tebakkalimat",
  description: "Sentence guessing game",
  async execute(bot, msg) {
    const chatId = msg.chat.id;
    const text = (msg.text || "").trim().toLowerCase();
    if (!isAuthorized(chatId)) return;

    // 🔑 handle surrender
    if (text === "/tebakkalimat surrender") {
      if (!activeSentenceGuess[chatId]) {
        return bot.sendMessage(chatId, "⚠️ No Sentence Guess game is currently running in this chat.");
      }

      const { answer } = activeSentenceGuess[chatId];
      await bot.sendMessage(
        chatId,
        `🏳️ Game ended. The missing word was *${answer}*`,
        { parse_mode: "Markdown" }
      );

      delete activeSentenceGuess[chatId];
      return;
    }

    // prevent multiple games at once
    if (activeSentenceGuess[chatId]) {
      return bot.sendMessage(
        chatId,
        "⚠️ A Sentence Guess game is already running in this chat. Please finish it or surrender first."
      );
    }

    try {
      const res = await axios.get(
        `${process.env.siputzx}/api/games/tebakkalimat`,
        { timeout: 8000 }
      );

      const result = res.data;
      if (result?.status && result.data) {
        const question = result.data.soal;
        const answer = result.data.jawaban;

        activeSentenceGuess[chatId] = { answer };

        await bot.sendMessage(
          chatId,
          `✍️ *Fill in the missing word:*\n\n${question}`,
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
              `✅ Correct! ${answerMsg.from.first_name} got it right!\nThe missing word is *${answer}*`,
              { parse_mode: "Markdown" }
            );

            delete activeSentenceGuess[chatId];
            bot.removeListener("message", listener);
          }
        };

        bot.on("message", listener);
      } else {
        bot.sendMessage(chatId, "⚠️ Failed to fetch Sentence Guess question from the API.");
      }
    } catch (error) {
      console.error("Sentence Guess Error:", error.message);
      bot.sendMessage(chatId, "❌ An error occurred while fetching the question.");
    }
  },
};
