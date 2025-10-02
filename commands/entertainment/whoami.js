const axios = require("axios");
const { isAuthorized } = require("@/utils/helper");
const { setGame, getGame, clearGame } = require("@/utils/games");

module.exports = {
  name: "whoami",
  description: "Who Am I guessing game",
  async execute(ctx) {
    const chatId = ctx.chat.id;
    const text = (ctx.message?.text || "").trim().toLowerCase();
    if (!isAuthorized(chatId)) return;

    // 🔑 handle surrender
    if (text === "/whoami surrender") {
      const currentGame = getGame(chatId, "whoami");
      if (!currentGame) {
        return ctx.reply(
          "⚠️ No Who Am I game is currently running in this chat."
        );
      }

      await ctx.reply(
        `🏳️ Game ended. The correct answer was *${currentGame.answer}*`,
        { parse_mode: "Markdown" }
      );

      clearGame(chatId, "whoami");
      return;
    }

    // prevent multiple games
    if (getGame(chatId, "whoami")) {
      return ctx.reply("⚠️ A Who Am I game is already running in this chat.");
    }

    try {
      const res = await axios.get(
        createUrl("siputzx", "/api/games/siapakahaku"),
        {
          timeout: 8000,
        }
      );
      const result = res.data;
      if (
        (result?.status === true || result?.status === "true") &&
        result.data
      ) {
        const question = result.data.soal;
        const answer = result.data.jawaban;

        setGame(chatId, "whoami", { answer });

        await ctx.reply(question, { parse_mode: "Markdown" });
      } else {
        console.log("Invalid WhoAmI API response:", result);
        ctx.reply("⚠️ Failed to fetch the question from the API.");
      }
    } catch (error) {
      console.error("WhoAmI Error:", error.message);
      ctx.reply("❌ An error occurred while fetching the question.");
    }
  },
};
