const { insertAutoStatus } = require("@/utils/mongodb");
const { privat } = require("@/utils/helper");

module.exports = {
  name: "addauto",
  description: "add auto status whitelist",

  async execute(ctx) {
    const chatId = ctx.chat.id;

    if (!privat(ctx.from.id)) {
      return ctx.reply("You don't have permission.");
    }

    try {
      const result = await insertAutoStatus({ id: chatId, status: true });

      if (!result.success) {
        return ctx.reply("⚠️ ID ini sudah ada di whitelist.");
      }

      return ctx.reply("✅ Berhasil ditambahkan ke whitelist!");
    } catch (error) {
      console.error("❌ Gagal menambahkan:", error);
      return ctx.reply("Terjadi kesalahan saat menambahkan ke whitelist.");
    }
  },
};
