const { getModelByRole, userModelSelection } = require("@/utils/modelSelect");
const { isAuthorized, privat } = require("@/utils/helper");

module.exports = {
  name: "cekmodel",
  description: "Check which model is currently in use by your role",
  async execute(bot, msg) {
    const chatId = msg.chat.id;

    if (!isAuthorized(chatId)) return;

    const isPriv = privat(chatId);

    if (isPriv) {
      const modelPriv = userModelSelection.privat || "Not set";
      const modelAuth = userModelSelection.authorized || "Not set";

      return bot.sendMessage(chatId,
        `🔐 *Model Status (Owner View)*\n\n` +
        `• 👑 Privat Model: *${modelPriv}*\n` +
        `• 👥 Authorized Model: *${modelAuth}*`,
        { parse_mode: "Markdown" }
      );
    }

    // If it's just an ordinary authorized
    const model = getModelByRole(chatId) || "Not set";
    return bot.sendMessage(chatId,
      `🔍 Current model for *authorized* users:\n*${model}*`,
      { parse_mode: "Markdown" }
    );
  }
};
