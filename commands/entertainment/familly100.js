const axios = require("axios");
const { isAuthorized } = require("@/utils/helper");
const { setGame, getGame, clearGame } = require("@/utils/games");

module.exports = {
  name: "family100",
  description: "Family 100 guessing game",

  async execute(ctx, args) {
    const chatId = ctx.chat.id;
    if (!isAuthorized(chatId)) return;

    const subcommand = (args[0] || "").toLowerCase();

    // 🏳️ Surrender
    if (subcommand === "surrender") {
      const currentGame = getGame(chatId, "family100");
      if (!currentGame) {
        return ctx.reply("⚠️ No Family 100 game is currently running in this chat.");
      }

      await ctx.reply(
        `🏳️ Game ended. The correct answers were:\n- ${currentGame.answers.join("\n- ")}`,
        { parse_mode: "Markdown" }
      );

      clearGame(chatId, "family100");
      return;
    }

    // 🚫 Prevent multiple games
    if (getGame(chatId, "family100")) {
      return ctx.reply(
        "⚠️ A Family 100 game is already running in this chat. Please finish it first or surrender."
      );
    }

    try {
      const res = await axios.get(`${process.env.siputzx}/api/games/family100`, {
        timeout: 8000,
      });

      const result = res.data;
      if (result?.status && result.data) {
        const question = result.data.soal;
        const answers = result.data.jawaban.map((a) => a.toLowerCase());

        setGame(chatId, "family100", { answers, found: [] });

        await ctx.reply(question, { parse_mode: "Markdown" });
      } else {
        ctx.reply("⚠️ Failed to fetch Family 100 question from the API.");
      }
    } catch (error) {
      console.error("Family100 Error:", error.message);
      ctx.reply("❌ An error occurred while fetching the question.");
    }
  },
};
