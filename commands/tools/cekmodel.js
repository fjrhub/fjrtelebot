const { getModelByRole, userModelSelection } = require("@/utils/modelSelect");
const { isAuthorized, privat } = require("@/utils/helper");

module.exports = {
  name: "cekmodel",
  description: "Check which model is currently in use by your role",
  async execute(ctx) {
    const chatId = ctx.chat.id;
    const messageId = ctx.message?.message_id;

    setTimeout(async () => {
      try {
        if (messageId) await ctx.deleteMessage(messageId);
      } catch (err) {
        console.error("Failed to delete user message:", err.message);
      }
    }, 1000);

    if (!isAuthorized(chatId)) return;

    const isPriv = privat(chatId);

    if (isPriv) {
      const modelPriv = userModelSelection.privat || "Not set";
      const modelAuth = userModelSelection.authorized || "Not set";

      return ctx.reply(
        `🔐 *Model Status (Owner View)*\n\n` +
        `• 👑 Privat Model: *${modelPriv}*\n` +
        `• 👥 Authorized Model: *${modelAuth}*`,
        { parse_mode: "Markdown" }
      );
    }

    const model = getModelByRole(chatId) || "Not set";
    return ctx.reply(
      `🔍 Current model for *authorized* users:\n*${model}*`,
      { parse_mode: "Markdown" }
    );
  }
};
