const { setAutoStatus } = require("@/utils/supabase");
const { isAuthorized } = require("@/utils/helper");

module.exports = {
  name: "settings",

  async execute(ctx) {
    const chatId = ctx.chat.id;
    if (!isAuthorized(chatId)) return;

    // Send settings message with inline keyboard
    const sentMsg = await ctx.reply("⚙️ Auto Downloader Settings:", {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Enable", callback_data: `settings:auto_on:${ctx.message.message_id}` },
            { text: "🛑 Disable", callback_data: `settings:auto_off:${ctx.message.message_id}` },
          ],
        ],
      },
    });

    // Delete user message after 1 second
    setTimeout(() => {
      ctx.api.deleteMessage(chatId, ctx.message.message_id).catch(() => {});
    }, 1000);

    // Auto delete both messages after 15 seconds if no button pressed
    setTimeout(() => {
      ctx.api.deleteMessage(chatId, sentMsg.message_id).catch(() => {});
      ctx.api.deleteMessage(chatId, ctx.message.message_id).catch(() => {});
    }, 15000);
  },

  async handleCallback(ctx, query) {
    const chatId = query.message.chat.id;
    const [_, action, userMsgId] = query.data.split(":");
    if (!isAuthorized(chatId)) return;

    if (action === "auto_on") {
      await setAutoStatus(chatId, true);
      await ctx.api.answerCallbackQuery(query.id, { text: "✅ Enabled!" });

      await ctx.api.editMessageText(chatId, query.message.message_id, "✅ Auto Downloader is now *enabled*", {
        parse_mode: "Markdown",
      });

      setTimeout(() => {
        ctx.api.deleteMessage(chatId, query.message.message_id).catch(() => {});
        ctx.api.deleteMessage(chatId, userMsgId).catch(() => {});
      }, 3000);
    }

    if (action === "auto_off") {
      await setAutoStatus(chatId, false);
      await ctx.api.answerCallbackQuery(query.id, { text: "🛑 Disabled!" });

      await ctx.api.editMessageText(chatId, query.message.message_id, "🛑 Auto Downloader is now *disabled*", {
        parse_mode: "Markdown",
      });

      setTimeout(() => {
        ctx.api.deleteMessage(chatId, query.message.message_id).catch(() => {});
        ctx.api.deleteMessage(chatId, userMsgId).catch(() => {});
      }, 3000);
    }
  },
};
