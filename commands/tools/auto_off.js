const { setAutoStatus } = require("@/utils/supabase");

module.exports = {
  name: "auto_off",
  async execute(bot, msg) {
    await setAutoStatus(msg.chat.id, false);
    bot.sendMessage(msg.chat.id, "🛑 Auto TikTok Downloader is now *disabled*", {
      parse_mode: "Markdown",
    });
  },
};
