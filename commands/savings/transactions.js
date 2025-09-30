const { privat } = require("@/utils/helper");
const { getTransactions } = require("@/utils/supabase");
const { InlineKeyboard } = require("grammy");

module.exports = {
  name: "transactions",
  description: "Show filtered transaction list",

  async execute(ctx) {
    const chatId = ctx.chat.id;
    if (!privat(chatId)) return;

    const args = (ctx.message.text || "").split(" ").slice(1);
    const wallet = args[0] || "";
    const month = args[1] || "";
    const page = parseInt(args[2]) || 1;

    await sendTransactionList(ctx, wallet, month, page, false);
  },

  async handleCallback(ctx) {
    const data = ctx.callbackQuery.data; // Format: transactions:wallet:month:page
    await ctx.answerCallbackQuery();

    const [, wallet, month, pageStr] = data.split(":");
    const page = parseInt(pageStr);

    await sendTransactionList(ctx, wallet, month, page, true);
  },
};

async function sendTransactionList(ctx, wallet, month, page = 1, isEdit = false) {
  const limit = 10;
  const { data, error } = await getTransactions({ wallet, month, page, limit });

  if (error || !data || data.length === 0) {
    const text = "📭 No transactions found.";
    if (isEdit) {
      await ctx.editMessageText(text);
    } else {
      await ctx.reply(text);
    }
    return;
  }

  data.sort((a, b) => a.id - b.id);

  let message = `====== *Transaction History (Page ${page})* =======\n\n`;

  data.forEach((tx) => {
    const formattedAmount = tx.amount.toLocaleString("id-ID");
    const date = new Date(tx.date);
    const [day, monthNum, year] = date
      .toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" })
      .split("/");

    const time = date
      .toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Jakarta",
      })
      .replace(/:/g, ".");

    message += `${tx.id} | ${day}/${monthNum}/${year} - ${time}\n`;
    message += `Rp ${formattedAmount} - ${tx.wallet}\n`;
    message += `${tx.information}\n\n`;
  });

  let hasNext = false;
  if (data.length === limit) {
    const { data: nextData } = await getTransactions({ wallet, month, page: page + 1, limit });
    hasNext = nextData && nextData.length > 0;
  }

  const keyboard = new InlineKeyboard();
  if (page > 1) keyboard.text("⬅️ Prev", `transactions:${wallet}:${month}:${page - 1}`);
  if (hasNext) keyboard.text("➡️ Next", `transactions:${wallet}:${month}:${page + 1}`);

  if (isEdit) {
    await ctx.editMessageText(message, { parse_mode: "Markdown", reply_markup: keyboard });
  } else {
    await ctx.reply(message, { parse_mode: "Markdown", reply_markup: keyboard });
  }
}
