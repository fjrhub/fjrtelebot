const { privat } = require("@/utils/helper");

module.exports = {
  name: "ping",
  description: "Test Connection",

  execute(ctx) {
    const chatId = ctx.chat.id;

    // Check if chat is private / allowed
    if (!privat(chatId)) {
      return ctx.reply("You don't have permission.");
    }

    // Reply with Pong if allowed
    return ctx.reply("Pong!");
  },
};
