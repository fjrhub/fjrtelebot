const { exec } = require("child_process");
const axios = require("axios");
const { privat } = require("@/utils/helper");

module.exports = {
  name: "rednote",
  description: "Send video directly from a URL using yt-dlp",
  async execute(bot, msg) {
    const chatId = msg.chat.id;
    if (!privat(chatId)) return;

    const args = msg.text.trim().split(" ");
    if (args.length < 2)
      return bot.sendMessage(chatId, "Please provide a valid URL: /rednote <url>");

    const inputUrl = args[1];

    try {
      // Extract direct video URL using yt-dlp
      const directVideoUrl = await new Promise((resolve, reject) => {
        exec(`yt-dlp -g "${inputUrl}"`, (err, stdout, stderr) => {
          if (err) {
            console.error("yt-dlp error:", stderr || err);
            return reject("Failed to get direct video URL.");
          }
          resolve(stdout.trim());
        });
      });

      // Fetch video stream using Axios
      const videoResponse = await axios({
        method: "GET",
        url: directVideoUrl,
        responseType: "stream",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          "Referer": inputUrl,
          "Accept": "*/*",
          "Connection": "keep-alive",
        },
      });

      // Send video stream to Telegram
      await bot.sendVideo(chatId, videoResponse.data, {
        caption: "Here is the video 🎥",
      });
    } catch (err) {
      console.error("Failed to send video:", err.message || err);
      bot.sendMessage(chatId, "❌ Failed to fetch or send the video.");
    }
  },
};
