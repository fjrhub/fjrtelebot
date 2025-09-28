const { setAutoStatus } = require("@/utils/supabase");
const { isAuthorized } = require("@/utils/helper");

module.exports = {
  name: "settings",

  async execute(bot, msg) {
    const chatId = msg.chat.id;
    if (!isAuthorized(chatId)) return;

    bot.sendMessage(chatId, "⚙️ Pengaturan Auto Downloader:", {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Enable", callback_data: "settings:auto_on" },
            { text: "🛑 Disable", callback_data: "settings:auto_off" },
          ],
        ],
      },
    });
  },

  async handleCallback(bot, query) {
    const chatId = query.message.chat.id;
    const action = query.data.split(":")[1]; // ambil 'auto_on' atau 'auto_off'

    if (!isAuthorized(chatId)) return;

    if (action === "auto_on") {
      await setAutoStatus(chatId, true);
      bot.answerCallbackQuery(query.id, { text: "✅ Enabled!" });
      bot.editMessageText("✅ Auto Downloader is now *enabled*", {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: "Markdown",
      });
    }

    if (action === "auto_off") {
      await setAutoStatus(chatId, false);
      bot.answerCallbackQuery(query.id, { text: "🛑 Disabled!" });
      bot.editMessageText("🛑 Auto Downloader is now *disabled*", {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: "Markdown",
      });
    }
  },
};
