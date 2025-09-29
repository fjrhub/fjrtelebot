const { privat } = require("@/utils/helper");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

module.exports = {
  name: "yt-dlp",
  description: "Download video dari URL menggunakan yt-dlp",
  async execute(bot, msg) {
    const chatId = msg.chat.id;
    const text = msg.text.trim().split(" ");

    // Cek izin chat
    if (!privat(chatId)) {
      return bot.sendMessage(chatId, "You don't have permission.");
    }

    // Cek input URL
    if (text.length < 2) {
      return bot.sendMessage(chatId, "❌ Gunakan format: /yt-dlp <url>");
    }
    const url = text[1];

    // Nama file unik
    const outputFile = path.join(__dirname, `video_${Date.now()}.mp4`);

    bot.sendMessage(chatId, "⏳ Sedang mendownload video, tunggu sebentar...");

    // Jalankan yt-dlp
    exec(`yt-dlp -f mp4 -o "${outputFile}" "${url}"`, async (error, stdout, stderr) => {
      if (error) {
        return bot.sendMessage(chatId, `❌ Error: ${error.message}`);
      }
      if (stderr && !fs.existsSync(outputFile)) {
        return bot.sendMessage(chatId, `⚠️ Stderr: ${stderr}`);
      }

      try {
        // Kirim video ke Telegram
        await bot.sendVideo(chatId, outputFile, {
          caption: `✅ Download selesai dari:\n${url}`,
        });

        // Hapus file setelah dikirim
        fs.unlinkSync(outputFile);
      } catch (err) {
        bot.sendMessage(chatId, `❌ Gagal mengirim video: ${err.message}`);
      }
    });
  },
};
