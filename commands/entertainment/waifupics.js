const { isAuthorized } = require("@/utils/helper");
const axios = require("axios");

module.exports = {
  name: "waifupics",
  description: "Get a random waifu image from the API waifupics",
  async execute(bot, msg) {
    const chatId = msg.chat.id;
    if (!isAuthorized(chatId)) return;
    try {
      const response = await axios.get(`${process.env.waifupics}/sfw/waifu`);
      bot.sendPhoto(chatId, response.data.url);
    } catch (error) {
      bot.sendMessage(chatId, "Failed to retrieve data.");
    }
  },
};
