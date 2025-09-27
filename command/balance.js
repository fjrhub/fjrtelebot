const { getWIBTime, privat } = require("../utils/helper");
const { supabase } = require("../utils/supabase");

module.exports = {
  name: "balance",
  description: "Show your balance",
  async execute(bot, msg, args) {
    const chatId = msg.chat.id;

    // Restrict access to private users only
    if (!privat(chatId)) return;

    // Valid args: no argument OR '-a'
    if (args.length > 0 && args[0] !== "-a") {
      // Invalid argument: ignore and do nothing
      return;
    }

    const showAll = args[0] === "-a";
    let data, error;

    if (showAll) {
      // Load all balance records
      ({ data, error } = await supabase
        .from('saldo')
        .select('*'));
    } else {
      // Load only the first balance record
      ({ data, error } = await supabase
        .from('saldo')
        .select('*')
        .limit(1)
        .single());
    }

    if (error) {
      console.error(error);
      return bot.sendMessage(chatId, 'Failed to check balance.');
    }

    // If only one record (not array)
    if (!showAll) {
      if (!data) {
        return bot.sendMessage(chatId, 'No balance data found.');
      }

      const message = `🧾 Wallet: ${data.name}
💰 Balance: Rp${data.total.toLocaleString('id-ID')}
📅 Last updated: ${getWIBTime()}`;

      return bot.sendMessage(chatId, message);
    }

    // If multiple records
    if (!data || data.length === 0) {
      return bot.sendMessage(chatId, 'No balance data found.');
    }

    const totalBalance = data.reduce((sum, item) => sum + item.total, 0);

    let message = `📊 *Wallet Balances*\n\n`;
    data.forEach((item, index) => {
      message += `🧾 Wallet ${index + 1}: ${item.name}\n💰 Balance: Rp${item.total.toLocaleString('id-ID')}\n\n`;
    });
    message += `🔢 *Total Balance:* Rp${totalBalance.toLocaleString('id-ID')}\n`;
    message += `📅 Last updated: ${getWIBTime()}`;

    bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
  }
};
