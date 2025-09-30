const axios = require("axios");
const { isAuthorized } = require("@/utils/helper");
const { setGame, getGame, clearGame } = require("@/utils/games");
const tools = require("@/utils/api");

module.exports = {
  name: "tebakkalimat",
  description: "Sentence guessing game",
  async execute(ctx, args) {
    const chatId = ctx.chat.id;
    if (!isAuthorized(chatId)) return;

    const subcommand = (args[0] || "").toLowerCase();

    // 🔑 handle surrender
    if (subcommand === "surrender") {
      const game = getGame(chatId, "tebakkalimat");
      if (!game) {
        return ctx.reply(
          "⚠️ No Sentence Guess game is currently running in this chat."
        );
      }

      await ctx.reply(`🏳️ Game ended. The missing word was *${game.answer}*`, {
        parse_mode: "Markdown",
      });

      clearGame(chatId, "tebakkalimat");
      return;
    }

    // prevent multiple games
    if (getGame(chatId, "tebakkalimat")) {
      return ctx.reply(
        "⚠️ A Sentence Guess game is already running in this chat. Please finish it or surrender first."
      );
    }

    try {
      const res = await axios.get(
        tools.createUrl("siputzx", "/api/games/tebakkalimat"),
        {
          timeout: 8000,
        }
      );
      const result = res.data;
      if (result?.status && result.data) {
        const question = result.data.soal;
        const answer = result.data.jawaban;

        setGame(chatId, "tebakkalimat", { answer });

        await ctx.reply(`✍️ *Fill in the missing word:*\n\n${question}`, {
          parse_mode: "Markdown",
        });
      } else {
        ctx.reply("⚠️ Failed to fetch Sentence Guess question from the API.");
      }
    } catch (error) {
      console.error("Sentence Guess Error:", error.message);
      ctx.reply("❌ An error occurred while fetching the question.");
    }
  },
};
