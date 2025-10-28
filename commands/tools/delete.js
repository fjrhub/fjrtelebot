const { isAuthorized } = require("@/utils/helper");

module.exports = {
  name: "delete",
  aliases: ["d"],
  description: "Delete a bot message when used as a reply",
  async execute(ctx) {
    const chatId = ctx.chat.id;
    if (!isAuthorized(chatId)) return;

    const reply = ctx.message?.reply_to_message;

    if (!reply) {
      return ctx.api.deleteMessage(chatId, ctx.message.message_id);
    }

    if (reply.from?.id !== ctx.me.id) {
      return ctx.api.deleteMessage(chatId, ctx.message.message_id);
    }

    try {
      await ctx.api.deleteMessage(chatId, reply.message_id);
      await ctx.api.deleteMessage(chatId, ctx.message.message_id);
    } catch (err) {
      console.error(err);
    }
  },
};
