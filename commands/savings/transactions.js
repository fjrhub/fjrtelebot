const { privat } = require("../../utils/helper");
const { getTransactions } = require("../../utils/supabase");

module.exports = {
  name: "transactions",
  description: "Show filtered transaction list",

  async execute(bot, msg, args) {
    const chatId = msg.chat.id;
    if (!privat(chatId)) return;

    const wallet = args[0] || "";
    const month = args[1] || "";
    const page = parseInt(args[2]) || 1;

    // display transaction (first send)
    sendTransactionList(bot, chatId, null, wallet, month, page, false);
  },

  async handleCallback(bot, query) {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const data = query.data; // Format: transactions:wallet:month:page

    bot.answerCallbackQuery(query.id);

    const [, wallet, month, pageStr] = data.split(":");
    const page = parseInt(pageStr);

    // display transaction (edit message)
    sendTransactionList(bot, chatId, messageId, wallet, month, page, true);
  },
};

async function sendTransactionList(
  bot,
  chatId,
  messageId,
  wallet,
  month,
  page = 1,
  isEdit = false
) {
  const limit = 10;
  const { data, error } = await getTransactions({ wallet, month, page, limit });

  if (error || !data || data.length === 0) {
    const text = "📭 No transactions found.";
    if (isEdit) {
      return bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
      });
    } else {
      return bot.sendMessage(chatId, text);
    }
  }

  // Sort from old to new
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

  // Optimization: if the data is less than limit, there is no need to check the next page
  let hasNext = false;
  if (data.length === limit) {
    const { data: nextData } = await getTransactions({
      wallet,
      month,
      page: page + 1,
      limit,
    });
    hasNext = nextData && nextData.length > 0;
  }

  const inlineButtons = [
    [
      ...(page > 1
        ? [
            {
              text: "⬅️ Prev",
              callback_data: `transactions:${wallet}:${month}:${page - 1}`,
            },
          ]
        : []),
      ...(hasNext
        ? [
            {
              text: "➡️ Next",
              callback_data: `transactions:${wallet}:${month}:${page + 1}`,
            },
          ]
        : []),
    ],
  ];

  const options = {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: inlineButtons,
    },
  };

  if (isEdit) {
    bot.editMessageText(message, {
      ...options,
      chat_id: chatId,
      message_id: messageId,
    });
  } else {
    bot.sendMessage(chatId, message, options);
  }
}
