const { isAuthorized, privat } = require("../utils/helper");

module.exports = {
  name: "ping",
  description: "Test Connection",
  execute(bot, msg, args) {
    const chatId = msg.chat.id;

    // Check if the chat is private or allowed
    if (!privat(chatId)) {
      return bot.sendMessage(chatId, "You don't have permission.");
    }

    // If authorized, respond with 'Pong!'
    bot.sendMessage(chatId, `Pong!`);
  },
};
