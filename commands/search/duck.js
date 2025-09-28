const { privat } = require("../../utils/helper");
const axios = require("axios");
require("dotenv").config();

module.exports = {
  name: "duck",
  description: "Search information using the DuckDuckGo API",
  async execute(bot, msg, args) {
    const chatId = msg.chat.id;
    const input = args.slice(0).join(" ");
    console.log(input);
    if (!privat(chatId)) return;
    if (input) {
      try {
        const apiUrl =
          process.env.FAST +
          `/aiexperience/duckassist?ask=${encodeURIComponent(input)}`;
        const response = await axios.get(apiUrl);
        const result = response.data.result.answer;
        bot.sendMessage(chatId, result);
      } catch (error) {
        console.error(error);
        bot.sendMessage(
          chatId,
          "Terjadi kesalahan saat mengambil data dari API."
        );
      }
    } else {
      bot.sendMessage(chatId, "/duck <prompt> ");
    }
  },
};
