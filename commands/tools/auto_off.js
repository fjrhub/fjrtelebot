const { setAutoStatus } = require("@/utils/supabase");
const { isAuthorized } = require("@/utils/helper");

module.exports = {
  name: "auto_off",
  async execute(bot, msg) {
    const chatId = msg.chat.id;
    if (!isAuthorized(chatId)) return;
    await setAutoStatus(chatId, false);
    bot.sendMessage(chatId, "🛑 Auto TikTok Downloader is now *disabled*", {
      parse_mode: "Markdown",
    });
  },
};
