const { exec } = require("child_process");
const { privat } = require("@/utils/helper");

module.exports = {
  name: "rednote",
  description: "Ambil video dari link via yt-dlp dan kirim ke Telegram",
  async execute(bot, msg) {
    const chatId = msg.chat.id;
    const text = msg.text || "";
    if (!privat(chatId)) return;

    const parts = text.trim().split(" ");
    if (parts.length < 2) {
      bot.sendMessage(chatId, "❌ Format salah. Gunakan: `/send <link>`", { parse_mode: "Markdown" });
      return;
    }

    const inputUrl = parts[1];

    // Jalankan yt-dlp untuk dapatkan direct video URL
    exec(`yt-dlp -f best[ext=mp4] -g "${inputUrl}"`, async (err, stdout, stderr) => {
      if (err) {
        console.error("Gagal mengambil video:", err);
        bot.sendMessage(chatId, "❌ Gagal mengambil video dari link.");
        return;
      }

      const directVideoUrl = stdout.trim();

      try {
        await bot.sendVideo(chatId, directVideoUrl, {
          caption: "✅ Berikut videonya dari yt-dlp!",
        });
      } catch (e) {
        console.error("Gagal kirim video:", e.message);
        bot.sendMessage(chatId, "❌ Gagal mengirim video. Mungkin URL tidak bisa diakses Telegram.");
      }
    });
  },
};
