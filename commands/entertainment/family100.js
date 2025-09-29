const axios = require("axios");
const { isAuthorized } = require("@/utils/helper");

// store active games per chat
const activeGames = {};

module.exports = {
  name: "family100",
  description: "Family 100 guessing game",
  async execute(bot, msg) {
    const chatId = msg.chat.id;
    const text = (msg.text || "").trim().toLowerCase();
    if (!isAuthorized(chatId)) return;


    // handle surrender directly
    if (text === "/family100 surrender") {
      if (!activeGames[chatId]) {
        return bot.sendMessage(chatId, "⚠️ No Family 100 game is currently running in this chat.");
      }

      const { answers } = activeGames[chatId];
      await bot.sendMessage(
        chatId,
        `🏳️ Game ended. The correct answers were:\n- ${answers.join("\n- ")}`,
        { parse_mode: "Markdown" }
      );

      delete activeGames[chatId];
      return;
    }

    // if already running, block new game
    if (activeGames[chatId]) {
      return bot.sendMessage(
        chatId,
        "⚠️ A Family 100 game is already running in this chat. Please finish it first or type /family100 surrender."
      );
    }

    try {
      const res = await axios.get(
        `${process.env.siputzx}/api/games/family100`,
        { timeout: 8000 }
      );

      const result = res.data;

      if (result?.status && result.data) {
        const question = result.data.soal;
        const answers = result.data.jawaban.map((a) => a.toLowerCase());

        activeGames[chatId] = { answers, found: [] };

        await bot.sendMessage(
          chatId,
          question,
          { parse_mode: "Markdown" }
        );

        const listener = async (answerMsg) => {
          if (answerMsg.chat.id !== chatId) return;
          if (!answerMsg.text) return;

          const userAnswer = answerMsg.text.trim().toLowerCase();
          const game = activeGames[chatId];
          if (!game) return;

          // already found?
          if (game.found.includes(userAnswer)) return;

          // correct answer
          if (game.answers.includes(userAnswer)) {
            game.found.push(userAnswer);

            await bot.sendMessage(
              chatId,
              `✅ ${answerMsg.from.first_name} found one: *${userAnswer}* (${game.found.length}/${game.answers.length})`,
              { parse_mode: "Markdown" }
            );

            // all answers found → game ends
            if (game.found.length === game.answers.length) {
              await bot.sendMessage(
                chatId,
                `🎉 All answers have been found!\nThe answers were:\n- ${game.answers.join("\n- ")}`,
                { parse_mode: "Markdown" }
              );
              delete activeGames[chatId];
              bot.removeListener("message", listener);
            }
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
