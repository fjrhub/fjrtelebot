const axios = require("axios");
const { isAuthorized } = require("@/utils/helper");
const { setGame, getGame, clearGame } = require("@/utils/games");

module.exports = {
  name: "tebakkata",
  description: "Word guessing game",
  async execute(ctx, args) {
    const chatId = ctx.chat.id;
    if (!isAuthorized(chatId)) return;

    const subcommand = (args[0] || "").toLowerCase();

    // 🔑 handle surrender
    if (subcommand === "surrender") {
      const game = getGame(chatId, "tebakkata");
      if (!game) {
        return ctx.reply(
          "⚠️ No Word Guess game is currently running in this chat."
        );
      }

      await ctx.reply(`🏳️ Game ended. The correct word was *${game.answer}*`, {
        parse_mode: "Markdown",
      });

      clearGame(chatId, "tebakkata");
      return;
    }

    // prevent multiple games at once
    if (getGame(chatId, "tebakkata")) {
      return ctx.reply(
        "⚠️ A Word Guess game is already running in this chat. Please finish it or surrender first."
      );
    }

    try {
      const res = await axios.get(
        createUrl("siputzx", "/api/games/tebakkata"),
        {
          timeout: 8000,
        }
      );

      const result = res.data;
      if (result?.status && result.data) {
        const question = result.data.soal;
        const answer = result.data.jawaban;

        setGame(chatId, "tebakkata", { answer });

        await ctx.reply(
          `🧩 *Guess the word from these clues:*\n\n${question}`,
          { parse_mode: "Markdown" }
        );
      } else {
        ctx.reply("⚠️ Failed to fetch Word Guess question from the API.");
      }
    } catch (error) {
      console.error("Word Guess Error:", error.message);
      ctx.reply("❌ An error occurred while fetching the question.");
    }
  },
};
