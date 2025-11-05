const { getAutoStatusById } = require("@/utils/mongodb");
const { privat } = require("@/utils/helper");

module.exports = {
  name: "checkauto",
  description: "Check if chat is in auto whitelist and show its status",

  async execute(ctx) {
    const chatId = ctx.chat.id;

    // Only allow private users
    if (!privat(ctx.from.id)) {
      return ctx.reply("You don't have permission to use this command.");
    }

    try {
      const result = await getAutoStatusById(chatId);

      if (!result) {
        return ctx.reply("❌ This chat is not registered in the whitelist.");
      }

      const statusText = result.status ? "🟢 Active" : "🔴 Inactive";

      return ctx.reply(`✅ This chat is registered in the whitelist.\nStatus: ${statusText}`);
    } catch (error) {
      console.error("❌ Failed to check whitelist status:", error);
      return ctx.reply("An error occurred while checking the whitelist status.");
    }
  },
};
