const { privat } = require("@/utils/helper");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const tiktokRegex =
  /^(?:https?:\/\/)?(?:www\.|vm\.|vt\.)?tiktok\.com\/[^\s]+$/i;
const instagramRegex =
  /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/(reel|p|tv)\/[A-Za-z0-9_-]+\/?(?:\?[^ ]*)?$/i;
const facebookRegex =
  /^(?:https?:\/\/)?(?:www\.|web\.)?facebook\.com\/(?:share\/(?:r|v)\/|reel\/|watch\?v=|permalink\.php\?story_fbid=|[^\/]+\/posts\/|video\.php\?v=)[^\s]+$/i;
const youtubeNormalRegex =
  /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[A-Za-z0-9_-]{11}(?:[&?][^\s]*)?$/i;
const youtubeShortRegex =
  /^(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/[A-Za-z0-9_-]{11}(?:\?[^\s]*)?$/i;

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

    // Tentukan folder output di root project (/yt-dlp)
    const outputDir = path.resolve(__dirname, "../../yt-dlp");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Nama file unik
    const outputFile = path.join(outputDir, `video_${Date.now()}.mp4`);

    bot.sendMessage(chatId, "⏳ Sedang mendownload video, tunggu sebentar...");

    // Tentukan format berdasarkan regex
    let format = "bestvideo+bestaudio/best"; // default kualitas terbaik

    if (youtubeShortRegex.test(url)) {
      format = "bestvideo[height<=1080]+bestaudio/best[height<=1080]";
    } else if (youtubeNormalRegex.test(url)) {
      format = "bestvideo[height<=720]+bestaudio/best[height<=720]";
    } else if (
      tiktokRegex.test(url) ||
      instagramRegex.test(url) ||
      facebookRegex.test(url)
    ) {
      format = "bestvideo+bestaudio/best"; // tetap terbaik
    }

    // Jalankan yt-dlp
    exec(
      `yt-dlp -f "${format}" --merge-output-format mp4 -o "${outputFile}" "${url}"`,
      async (error, stdout, stderr) => {
        if (error) {
          return bot.sendMessage(chatId, `❌ Error: ${error.message}`);
        }
        if (stderr && !stdout.includes("Merging formats")) {
          return bot.sendMessage(chatId, `⚠️ Stderr: ${stderr}`);
        }

        try {
          // cari file hasil download (format bisa .mp4 / .webm sebelum merge)
          const files = fs
            .readdirSync(outputDir)
            .filter((f) => f.startsWith("video_"));
          const latestFile = path.join(outputDir, files[files.length - 1]);

          await bot.sendVideo(chatId, latestFile, {
            caption: `✅ Download selesai dari:\n${url}`,
          });

          fs.unlinkSync(latestFile); // hapus setelah kirim
        } catch (err) {
          bot.sendMessage(chatId, `❌ Gagal mengirim video: ${err.message}`);
        }
      }
    );
  },
};
