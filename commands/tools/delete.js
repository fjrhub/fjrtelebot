const { isAuthorized } = require("@/utils/helper");

module.exports = {
  name: "delete",
  description: "Delete a bot message when used as a reply",
  async execute(ctx) {
    const chatId = ctx.chat.id;
    if (!isAuthorized(chatId)) return;

    const reply = ctx.message?.reply_to_message;

    if (!reply) {
      // Not replying to any message → just remove the /delete command
      return ctx.api.deleteMessage(chatId, ctx.message.message_id);
    }

    if (reply.from?.id !== ctx.me.id) {
      // Reply is not from the bot → remove only the /delete command
      return ctx.api.deleteMessage(chatId, ctx.message.message_id);
    }

    try {
      // Delete the bot's message
      await ctx.api.deleteMessage(chatId, reply.message_id);
      // Delete the /delete command as well
      await ctx.api.deleteMessage(chatId, ctx.message.message_id);
    } catch (err) {
      console.error(err);
    }
  },
};
