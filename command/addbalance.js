const { privat } = require("../utils/helper");
const { insertBalance } = require("../utils/supabase");

module.exports = {
  name: "addbalance",
  description: "Add a new balance entry",
  async execute(bot, msg, args) {
    const chatId = msg.chat.id;

    if (!privat(chatId)) return;

    if (args.length < 3) {
      return bot.sendMessage(chatId, "Usage: /addbalance <name> <amount> <information>");
    }

    const wallet = args[0];
    const amount = parseInt(args[1]);
    const information = args.slice(2).join(" ");

    if (!wallet || isNaN(amount) || !information) {
      return bot.sendMessage(chatId, "Invalid format. Example:\n/addbalance Dana 150000 Monthly savings");
    }

    const { error } = await insertBalance(amount, information, wallet);

    if (error) {
      // Tangani khusus jika wallet tidak ditemukan
      if (error.code === 'PGRST116') {
        return bot.sendMessage(chatId, `❌ Wallet *${wallet}* tidak ditemukan di saldo.\nSilakan tambahkan wallet terlebih dahulu.`, { parse_mode: "Markdown" });
      }

      // Jika error lain
      return bot.sendMessage(chatId, "❌ Gagal menambahkan balance. Silakan coba lagi nanti.");
    }

    bot.sendMessage(chatId, `✅ Balance berhasil ditambahkan:
📛 Wallet: ${wallet}
💰 Amount: Rp${amount.toLocaleString("id-ID")}
📝 Info: ${information}`);
  }
};
