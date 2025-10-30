const { deleteAutoStatus } = require("@/utils/mongodb");
const { privat } = require("@/utils/helper");

module.exports = {
  name: "delauto",
  description: "remove auto status whitelist",

  async execute(ctx) {
    const chatId = ctx.chat.id;

    if (!privat(ctx.from.id)) {
      return ctx.reply("You don't have permission.");
    }

    try {
      const result = await deleteAutoStatus(chatId);

      if (!result.success) {
        return ctx.reply("⚠️ ID ini tidak ada di whitelist.");
      }

      return ctx.reply("🗑️ Berhasil dihapus dari whitelist!");
    } catch (error) {
      console.error("❌ Gagal menghapus:", error);
      return ctx.reply("Terjadi kesalahan saat menghapus dari whitelist.");
    }
  },
};