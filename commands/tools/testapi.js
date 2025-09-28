const { privat } = require("@/utils/helper");

module.exports = {
  name: "testapi",
  description: "testapi",
  execute(bot, msg) {
    const chatId = msg.chat.id;
    if (!privat(chatId)) return;

    bot.sendMessage(chatId, `Pong!`);
  },
};
