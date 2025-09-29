const axios = require("axios");

// store active games per chat
const activeGames = {};

module.exports = {
  name: "whoami",
  description: "Who Am I guessing game",
  async execute(bot, msg) {
    const chatId = msg.chat.id;
    const text = (msg.text || "").trim().toLowerCase();

    // 🔑 handle surrender directly (skip creating new game)
    if (text === "/whoami surrender") {
      if (!activeGames[chatId]) {
        return bot.sendMessage(chatId, "⚠️ No game is currently running in this chat.");
      }

      const { answer } = activeGames[chatId];
      await bot.sendMessage(
        chatId,
        `🏳️ Game ended. The correct answer was *${answer}*`,
        { parse_mode: "Markdown" }
      );

      delete activeGames[chatId];
      return; // stop here
    }

    // if already running, block new game
    if (activeGames[chatId]) {
      return bot.sendMessage(
        chatId,
        "⚠️ A game is already running in this chat. Please finish it first or type /whoami surrender."
      );
    }

    try {
      const res = await axios.get(
        `${process.env.siputzx}/api/games/siapakahaku`,
        { timeout: 8000 }
      );

      const result = res.data;

      if (result?.status && result.data) {
        const question = result.data.soal;
        const answer = result.data.jawaban;

        activeGames[chatId] = { answer };

        await bot.sendMessage(
          chatId,
          `🤔 *Who Am I?*\n\n${question}\n\nEveryone can type your guess in this chat!\n\nType /whoami surrender to give up.`,
          { parse_mode: "Markdown" }
        );

        const listener = async (answerMsg) => {
          if (answerMsg.chat.id !== chatId) return;
          if (!answerMsg.text) return;

          const userAnswer = answerMsg.text.trim().toLowerCase();
          const correctAnswer = answer.toLowerCase();

          if (userAnswer === correctAnswer) {
            await bot.sendMessage(
              chatId,
              `✅ Correct! ${answerMsg.from.first_name} got it right!\nThe answer is *${answer}*`,
              { parse_mode: "Markdown" }
            );

            delete activeGames[chatId];
            bot.removeListener("message", listener);
          }
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
