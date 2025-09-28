const { privat } = require("@/utils/helper");
const axios = require("axios");

module.exports = {
  name: "waifuim",
  description: "Get a random waifu image from the API",
  async execute(bot, msg) {
    const chatId = msg.chat.id;
    if (!privat(chatId)) return;
    try {
      const response = await axios.get(`${process.env.waifuim}/search?included_tags=waifu`);
      const imageUrl = response.data.images[0].url;
      bot.sendPhoto(chatId, imageUrl);
    } catch (error) {
      console.error(error);
      bot.sendMessage(chatId, "Failed to retrieve data.");
    }
  },
};
