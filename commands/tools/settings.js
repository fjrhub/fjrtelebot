const { setAutoStatus } = require("@/utils/supabase");
const { isAuthorized } = require("@/utils/helper");

module.exports = {
  name: "settings",

  async execute(bot, msg) {
    const chatId = msg.chat.id;
    if (!isAuthorized(chatId)) return;

    // Send settings message
    const sentMsg = await bot.sendMessage(chatId, "⚙️ Auto Downloader Settings:", {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Enable", callback_data: `settings:auto_on:${msg.message_id}` },
            { text: "🛑 Disable", callback_data: `settings:auto_off:${msg.message_id}` },
          ],
        ],
      },
    });

    // Delete user message after 1s
    setTimeout(() => {
      bot.deleteMessage(chatId, msg.message_id).catch(() => {});
    }, 1000);

    // Auto delete both after 15s if no button pressed
    setTimeout(() => {
      bot.deleteMessage(chatId, sentMsg.message_id).catch(() => {});
      bot.deleteMessage(chatId, msg.message_id).catch(() => {});
    }, 15000);
  },

  async handleCallback(bot, query) {
    const chatId = query.message.chat.id;
    const [_, action, userMsgId] = query.data.split(":"); 
    if (!isAuthorized(chatId)) return;

    if (action === "auto_on") {
      await setAutoStatus(chatId, true);
      await bot.answerCallbackQuery(query.id, { text: "✅ Enabled!" });

      await bot.editMessageText("✅ Auto Downloader is now *enabled*", {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: "Markdown",
      });

      // Delete bot + user message after 3s
      setTimeout(() => {
        bot.deleteMessage(chatId, query.message.message_id).catch(() => {});
        bot.deleteMessage(chatId, userMsgId).catch(() => {});
      }, 3000);
    }

    if (action === "auto_off") {
      await setAutoStatus(chatId, false);
      await bot.answerCallbackQuery(query.id, { text: "🛑 Disabled!" });

      await bot.editMessageText("🛑 Auto Downloader is now *disabled*", {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: "Markdown",
      });

      // Delete bot + user message after 3s
      setTimeout(() => {
        bot.deleteMessage(chatId, query.message.message_id).catch(() => {});
        bot.deleteMessage(chatId, userMsgId).catch(() => {});
      }, 3000);
    }
  },
};
