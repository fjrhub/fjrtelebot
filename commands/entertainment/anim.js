const { privat } = require("@/utils/helper");
const axios = require("axios");
require("dotenv").config();

module.exports = {
  name: "anim",
  description: "Get a random waifu image from the API",
  async execute(bot, msg) {
    const chatId = msg.chat.id;
    if (!privat(chatId)) return;
    try {
      const response = await axios.get(`${process.env.WAIFU_API}/sfw/waifu`);
      bot.sendPhoto(chatId, response.data.url);
    } catch (error) {
      bot.sendMessage(chatId, "Failed to retrieve data.");
    }
  },
};
