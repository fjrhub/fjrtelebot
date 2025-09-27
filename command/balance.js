const { getWIBTime, privat } = require("../utils/helper");
const { getAllBalances, getSingleBalance } = require("../utils/supabase");

module.exports = {
  name: "balance",
  description: "Show your balance",
  async execute(bot, msg, args) {
    const chatId = msg.chat.id;

    if (!privat(chatId)) return;
    if (args.length > 0 && args[0] !== "-a") return;

    const showAll = args[0] === "-a";

    let data, error;

    if (showAll) {
      ({ data, error } = await getAllBalances());
    } else {
      ({ data, error } = await getSingleBalance());
    }

    if (error) {
      console.error(error);
      return bot.sendMessage(chatId, 'Failed to check balance.');
    }

    if (!showAll) {
      if (!data) return bot.sendMessage(chatId, 'No balance data found.');

      const message = `🧾 Wallet: ${data.wallet}
💰 Balance: Rp${data.amount.toLocaleString('id-ID')}
📅 Last updated: ${getWIBTime()}`;

      return bot.sendMessage(chatId, message);
    }

    if (!data || data.length === 0) {
      return bot.sendMessage(chatId, 'No balance data found.');
    }

    const totalBalance = data.reduce((sum, item) => sum + item.amount, 0);

    let message = `📊 *Wallet Balances*\n\n`;
    data.forEach((item, index) => {
      message += `🧾 Wallet ${index + 1}: ${item.wallet}\n💰 Balance: Rp${item.amount.toLocaleString('id-ID')}\n\n`;
    });
    message += `🔢 *Total Balance:* Rp${totalBalance.toLocaleString('id-ID')}\n`;
    message += `📅 Last updated: ${getWIBTime()}`;

    bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
  }
};
