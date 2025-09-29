const axios = require("axios");
const { isAuthorized } = require("@/utils/helper");

// store active asahotak games per chat
const activeAsahotak = {};

module.exports = {
  name: "asahotak",
  description: "Brain teaser quiz game",
  async execute(bot, msg) {
    const chatId = msg.chat.id;
    const text = (msg.text || "").trim().toLowerCase();
    if (!isAuthorized(chatId)) return;

    // 🔑 surrender handler
    if (text === "/asahotak surrender") {
      if (!activeAsahotak[chatId]) {
        return bot.sendMessage(chatId, "⚠️ Tidak ada game Asah Otak yang sedang berjalan.");
      }

      const { answer } = activeAsahotak[chatId];
      await bot.sendMessage(
        chatId,
        `🏳️ Game berakhir. Jawaban yang benar adalah *${answer}*`,
        { parse_mode: "Markdown" }
      );

      delete activeAsahotak[chatId];
      return;
    }

    // jika sudah ada game berjalan
    if (activeAsahotak[chatId]) {
      return bot.sendMessage(
        chatId,
        "⚠️ Game Asah Otak sudah berjalan di chat ini. Selesaikan dulu atau surrender."
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

        activeAsahotak[chatId] = { answer };

        await bot.sendMessage(chatId, question, { parse_mode: "Markdown" });

        // listener jawaban
        const listener = async (answerMsg) => {
          if (answerMsg.chat.id !== chatId) return;
          if (!answerMsg.text) return;

          const userAnswer = answerMsg.text.trim().toLowerCase();
          const correctAnswer = answer.toLowerCase();

          if (userAnswer === correctAnswer) {
            await bot.sendMessage(
              chatId,
              `✅ Benar! ${answerMsg.from.first_name} menjawab dengan tepat!\nJawabannya adalah *${answer}*`,
              { parse_mode: "Markdown" }
            );

            delete activeAsahotak[chatId];
            bot.removeListener("message", listener);
          }
        };

        bot.on("message", listener);
      } else {
        bot.sendMessage(chatId, "⚠️ Gagal mengambil soal dari API Asah Otak.");
      }
    } catch (error) {
      console.error("Asah Otak Error:", error.message);
      bot.sendMessage(chatId, "❌ Terjadi kesalahan saat mengambil soal.");
    }
  },
};
