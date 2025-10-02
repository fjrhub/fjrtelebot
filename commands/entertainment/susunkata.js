const axios = require("axios");
const { isAuthorized } = require("@/utils/helper");
const { setGame, getGame, clearGame } = require("@/utils/games");

module.exports = {
  name: "susunkata",
  description: "Word scramble game",
  async execute(ctx, args) {
    const chatId = ctx.chat.id;
    if (!isAuthorized(chatId)) return;

    const subcommand = (args[0] || "").toLowerCase();

    // surrender
    if (subcommand === "surrender") {
      const game = getGame(chatId, "susunkata");
      if (!game) {
        return ctx.reply(
          "⚠️ No Word Scramble game is currently running in this chat."
        );
      }

      await ctx.reply(
        `🏳️ Game ended. The correct answer was *${game.answer}*`,
        { parse_mode: "Markdown" }
      );

      clearGame(chatId, "susunkata");
      return;
    }

    // prevent multiple games
    if (getGame(chatId, "susunkata")) {
      return ctx.reply(
        "⚠️ A Word Scramble game is already running in this chat. Please finish it or surrender first."
      );
    }

    try {
      const res = await axios.get(
        createUrl("siputzx", "/api/games/susunkata"),
        {
          timeout: 8000,
        }
      );
      const result = res.data;
      if (result?.status && result.data) {
        const question = result.data.soal;
        const answer = result.data.jawaban;
        const type = result.data.tipe;

        setGame(chatId, "susunkata", { answer });

        await ctx.reply(
          `🔤 *Unscramble the letters:*\n\n${question}\n\n📌 Hint: *${type}*`,
          { parse_mode: "Markdown" }
        );
      } else {
        ctx.reply("⚠️ Failed to fetch Word Scramble question from the API.");
      }
    } catch (error) {
      console.error("Word Scramble Error:", error.message);
      ctx.reply("❌ An error occurred while fetching the question.");
    }
  },
};
