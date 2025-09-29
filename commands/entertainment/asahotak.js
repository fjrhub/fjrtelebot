const axios = require("axios");
const { isAuthorized } = require("@/utils/helper");

// store active brain teaser games per chat
const activeBrainTeaser = {};

module.exports = {
  name: "asahotak",
  description: "Brain teaser quiz game",
  async execute(bot, msg) {
    const chatId = msg.chat.id;
    const text = (msg.text || "").trim().toLowerCase();
    if (!isAuthorized(chatId)) return;

    // 🔑 handle surrender
    if (text === "/asahotak surrender") {
      if (!activeBrainTeaser[chatId]) {
        return bot.sendMessage(chatId, "⚠️ No Brain Teaser game is currently running in this chat.");
      }

      const { answer } = activeBrainTeaser[chatId];
      await bot.sendMessage(
        chatId,
        `🏳️ Game ended. The correct answer was *${answer}*`,
        { parse_mode: "Markdown" }
      );

      delete activeBrainTeaser[chatId];
      return;
    }

    // prevent multiple games in the same chat
    if (activeBrainTeaser[chatId]) {
      return bot.sendMessage(
        chatId,
        "⚠️ A Brain Teaser game is already running in this chat. Please finish it or surrender first."
      );
    }

    try {
      const res = await axios.get(
        `${process.env.siputzx}/api/games/asahotak`,
        { timeout: 8000 }
      );

      const result = res.data;
      if (result?.status && result.data) {
        const question = result.data.soal;
        const answer = result.data.jawaban;

        activeBrainTeaser[chatId] = { answer };

        await bot.sendMessage(chatId, question, { parse_mode: "Markdown" });

        // listener for answers
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

            delete activeBrainTeaser[chatId];
            bot.removeListener("message", listener);
          }
        };

        bot.on("message", listener);
      } else {
        bot.sendMessage(chatId, "⚠️ Failed to fetch Brain Teaser question from the API.");
      }
    } catch (error) {
      console.error("Brain Teaser Error:", error.message);
      bot.sendMessage(chatId, "❌ An error occurred while fetching the question.");
    }
  },
};
