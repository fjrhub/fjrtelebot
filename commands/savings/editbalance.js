const { privat } = require("../../utils/helper");
const { updateTransactionAndBalance } = require("../../utils/supabase");

module.exports = {
  name: "editbalance",
  description: "Edit a transaction and update the balance",
  async execute(bot, msg) {
    const chatId = msg.chat.id;
    const input = msg.text.split(" ").slice(1); // /editbalance 2 10000 WALLET

    if (!privat(chatId)) {
      return bot.sendMessage(chatId, "You do not have permission.");
    }

    if (input.length < 3) {
      return bot.sendMessage(
        chatId,
        `❌ Invalid format!\nExample: /editbalance 2 10000 WALLET`
      );
    }

    const id = parseInt(input[0]);
    const newAmount = parseFloat(input[1].replace(/\./g, "").replace(/,/g, ""));
    const newInfo = input.slice(2).join(" ").replace(/"/g, "");

    const result = await updateTransactionAndBalance(id, newAmount, newInfo);

    if (result.error) {
      return bot.sendMessage(chatId, `❌ ${result.error}`);
    }

    const { oldAmount, newBalance, wallet } = result;

    return bot.sendMessage(
      chatId,
      `✅ Transaction ID ${id} successfully updated!\n` +
        `💰 Previous: Rp ${oldAmount.toLocaleString("id-ID")}\n` +
        `➡️ Updated: Rp ${newAmount.toLocaleString("id-ID")}\n` +
        `📝 Info: ${newInfo}\n\n` +
        `💼 Balance for ${wallet}: Rp ${newBalance.toLocaleString("id-ID")}`
    );
  },
};
