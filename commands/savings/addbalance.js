const { privat } = require("@/utils/helper");
const { insertBalance } = require("@/utils/supabase");

module.exports = {
  name: "addbalance",
  description: "Add a new balance entry",

  async execute(ctx) {
    const chatId = ctx.chat.id;

    if (!privat(chatId)) {
      return ctx.reply("You don't have permission.");
    }

    const args = (ctx.message.text || "").split(" ").slice(1);

    if (args.length < 3) {
      return ctx.reply("Usage: /addbalance <wallet> <amount> <information>");
    }

    const wallet = args[0].toUpperCase();
    const rawAmount = parseFloat(args[1].replace(/\./g, "").replace(/,/g, ""));
    const amount = parseInt(rawAmount);
    const information = args.slice(2).join(" ");

    if (!wallet || isNaN(amount) || !information) {
      return ctx.reply(
        "Invalid format. Example:\n/addbalance DANA 150.000 Monthly savings"
      );
    }

    const { error } = await insertBalance(amount, information, wallet);

    if (error) {
      if (error.code === "PGRST116") {
        return ctx.reply(
          `❌ Wallet *${wallet}* not found in balance.\nPlease add the wallet first.`,
          { parse_mode: "Markdown" }
        );
      }
      return ctx.reply("❌ Failed to add balance. Please try again later.");
    }

    const formattedAmount = amount.toLocaleString("id-ID");

    return ctx.reply(
      `✅ Balance has been added successfully:
📛 Wallet: ${wallet}
💰 Amount: Rp${formattedAmount}
📝 Information: ${information}`
    );
  },
};
