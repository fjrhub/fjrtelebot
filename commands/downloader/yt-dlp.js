const { privat } = require("@/utils/helper");
const { exec } = require("child_process");

module.exports = {
  name: "yt-dlp",
  description: "Cek versi yt-dlp",
  execute(bot, msg) {
    const chatId = msg.chat.id;

    // Cek izin chat
    if (!privat(chatId)) {
      return bot.sendMessage(chatId, "You don't have permission.");
    }

    // Jalankan perintah yt-dlp --version
    exec("yt-dlp --version", (error, stdout, stderr) => {
      if (error) {
        return bot.sendMessage(chatId, `❌ Error: ${error.message}`);
      }
      if (stderr) {
        return bot.sendMessage(chatId, `⚠️ Stderr: ${stderr}`);
      }
      bot.sendMessage(chatId, `✅ yt-dlp version: ${stdout.trim()}`);
    });
  },
};
