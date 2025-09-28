const { setAutoStatus } = require("@/utils/supabase");

module.exports = {
  name: "auto_on",
  async execute(bot, msg) {
    await setAutoStatus(msg.chat.id, true);
    bot.sendMessage(msg.chat.id, "✅ Auto TikTok Downloader is now *enabled*", {
      parse_mode: "Markdown",
    });
  },
};
