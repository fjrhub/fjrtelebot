const { setAutoStatus } = require("@/utils/supabase");
const { isAuthorized } = require("@/utils/helper");

module.exports = {
  name: "auto_on",
  async execute(bot, msg) {
    const chatId = msg.chat.id;
    if (!isAuthorized(chatId)) return;
    await setAutoStatus(chatId, true);
    bot.sendMessage(chatId, "✅ Auto TikTok Downloader is now *enabled*", {
      parse_mode: "Markdown",
    });
  },
};
