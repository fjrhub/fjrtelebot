const { getModelByRole, userModelSelection } = require("@/utils/userModelSelection");
const { isAuthorized, privat } = require("@/utils/helper");

module.exports = {
  name: "cekmodel",
  description: "Check which model is currently in use by your role",
  async execute(bot, msg) {
    const chatId = msg.chat.id;

    if (!isAuthorized(chatId)) {
      return bot.sendMessage(chatId, "❌ You are not authorized to use this command.");
    }

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

    // Kalau hanya authorized biasa
    const model = getModelByRole(chatId) || "Not set";
    return bot.sendMessage(chatId,
      `🔍 Current model for *authorized* users:\n*${model}*`,
      { parse_mode: "Markdown" }
    );
  }
};
