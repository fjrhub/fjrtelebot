const { privat } = require("../../utils/helper");
const { insertBalance } = require("../../utils/supabase");

module.exports = {
  name: "addbalance",
  description: "Add a new balance entry",
  async execute(bot, msg, args) {
    const chatId = msg.chat.id;

    if (!privat(chatId)) return;

    if (args.length < 3) {
      return bot.sendMessage(chatId, "Usage: /addbalance <wallet> <amount> <information>");
    }

    const wallet = args[0].toUpperCase();
    const rawAmount = parseFloat(args[1].replace(/\./g, '').replace(/,/g, ''));
    const amount = parseInt(rawAmount);
    const information = args.slice(2).join(" ");

    if (!wallet || isNaN(amount) || !information) {
      return bot.sendMessage(chatId, "Invalid format. Example:\n/addbalance DANA 150.000 Monthly savings");
    }

    const { error } = await insertBalance(amount, information, wallet);

    if (error) {
      // Wallet not found in saldo
      if (error.code === 'PGRST116') {
        return bot.sendMessage(chatId, `❌ Wallet *${wallet}* not found in balance.\nPlease add the wallet first.`, {
          parse_mode: "Markdown",
        });
      }

      // Other errors
      return bot.sendMessage(chatId, "❌ Failed to add balance. Please try again later.");
    }

    const formattedAmount = amount.toLocaleString("id-ID");

    bot.sendMessage(
      chatId,
      `✅ Balance has been added successfully:
📛 Wallet: ${wallet}
💰 Amount: Rp${formattedAmount}
📝 Information: ${information}`
    );
  },
};
