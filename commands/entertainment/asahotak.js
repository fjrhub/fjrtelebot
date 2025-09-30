// commands/asahotak.js
const axios = require("axios");
const { isAuthorized } = require("@/utils/helper");

module.exports = {
  name: "asahotak",
  description: "Brain teaser quiz game",
  async execute(ctx, args, activeBrainTeaser) {
    const chatId = ctx.chat.id;
    if (!isAuthorized(chatId)) return;

    const subcommand = (args[0] || "").toLowerCase();

    // surrender
    if (subcommand === "surrender") {
      if (!activeBrainTeaser[chatId]) {
        return ctx.reply("⚠️ No Brain Teaser game is currently running in this chat.");
      }

      const { answer } = activeBrainTeaser[chatId];
      await ctx.reply(`🏳️ Game ended. The correct answer was *${answer}*`, {
        parse_mode: "Markdown",
      });

      delete activeBrainTeaser[chatId];
      return;
    }

    // prevent multiple games
    if (activeBrainTeaser[chatId]) {
      return ctx.reply(
        "⚠️ A Brain Teaser game is already running in this chat. Please finish it or surrender first."
      );
    }

    try {
      const res = await axios.get(`${process.env.siputzx}/api/games/asahotak`, {
        timeout: 8000,
      });

      const result = res.data;
      if (result?.status && result.data) {
        const question = result.data.soal;
        const answer = result.data.jawaban;
        console.log(answer)

        activeBrainTeaser[chatId] = { answer };

        await ctx.reply(question, { parse_mode: "Markdown" });
      } else {
        ctx.reply("⚠️ Failed to fetch Brain Teaser question from the API.");
      }
    } catch (error) {
      console.error("Brain Teaser Error:", error.message);
      ctx.reply("❌ An error occurred while fetching the question.");
    }
  },
};
