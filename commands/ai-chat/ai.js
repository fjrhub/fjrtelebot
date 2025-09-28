const { sendMessageToGroq, getChatHistory, resetChat, } = require("@/utils/groq");
const { isAuthorized, privat } = require("@/utils/helper");

module.exports = {
  name: "ai",
  description:
    "Chat with AI using Groq (supports memory, /ai history & /ai new)",
  async execute(bot, msg) {
    const chatId = msg.chat.id;

    if (!isAuthorized(chatId)) return;

    const modelId = privat(chatId) ? 1 : 2; // kamu bisa balik tergantung kebutuhan

    const text = msg.text?.trim();

    if (!text || text === "/ai") {
      return bot.sendMessage(
        chatId,
        `*Welcome to AI Chat*

Type your question after \`/ai\`, for example:
\`/ai What is artificial intelligence?\`

*Other commands:*
• \`/ai history\` – View your previous messages  
• \`/ai new\` – Start a new conversation

_Your chat history is saved per user._`,
        {
          parse_mode: "Markdown",
        }
      );
    }

    const args = text.split(" ").slice(1);
    const input = args.join(" ");

    if (input.toLowerCase() === "history") {
      const history = getChatHistory(chatId);
      if (!history.length) {
        return bot.sendMessage(chatId, "There is no chat history yet.");
      }

      const formatted = history
        .map((h) => `(${h.role}): ${h.content}`)
        .join("\n\n")
        .slice(-4096);

      return bot.sendMessage(chatId, formatted, { parse_mode: "Markdown" });
    }

    if (input.toLowerCase() === "new") {
      resetChat(chatId);
      return bot.sendMessage(chatId, "The conversation has been reset.");
    }

    try {
      const response = await sendMessageToGroq(chatId, input, modelId);
      if (!response) return bot.sendMessage(chatId, "Empty reply.");

      if (response.length > 4096) {
        for (let i = 0; i < response.length; i += 4096) {
          await bot.sendMessage(chatId, response.slice(i, i + 4096));
        }
      } else {
        bot.sendMessage(chatId, response, { parse_mode: "Markdown" });
      }
    } catch (err) {
      console.error("AI Error:", err);
      bot.sendMessage(
        chatId,
        "An error occurred while processing the request."
      );
    }
  },
};
