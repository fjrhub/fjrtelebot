const { privat } = require("@/utils/helper");

module.exports = {
  name: "ping",
  description: "Test Connection",

  execute(ctx) {
    const chatId = ctx.chat.id;

    // Cek apakah chat private / diperbolehkan
    if (!privat(chatId)) {
      return ctx.reply("You don't have permission.");
    }

    // Kalau lolos, balas Pong!
    ctx.reply("Pong!");
  },
};
