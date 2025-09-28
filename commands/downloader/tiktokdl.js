const { privat } = require("@/utils/helper");
const axios = require("axios");
require("dotenv").config();

module.exports = {
  name: "tt",
  description: "tiktok downloader",
  async execute(bot, msg, args) {
    const chatId = msg.chat.id;
    if (!privat(chatId)) return;
    const input = args[0];
    const response = await axios.get(
      `${process.env.FAST}/downup/ttdown?url=${encodeURIComponent(input)}`
    );
const data = response.data.result;

    const {
      duration,
      playCount,
      likes,
      comments,
      shares,
      media
    } = data;

    const caption = `
▶️ Views: ${playCount.toLocaleString()}
❤️ Likes: ${likes.toLocaleString()}
💬 Comments: ${comments.toLocaleString()}
🔁 Shares: ${shares.toLocaleString()}
⏱ Duration: ${duration}s

🔗 [LINK](${input})
    `.trim();

    await bot.sendVideo(chatId, media.videoUrl, {
      caption,
      parse_mode: 'Markdown'
    });
  }
};
