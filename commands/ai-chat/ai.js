const {
  sendMessageToGroq,
  getChatHistory,
  resetChat,
} = require("@/utils/groq");

const { isAuthorized, privat } = require("@/utils/helper");

module.exports = {
  name: "ai",
  description:
    "Chat with AI using Groq (supports memory, /ai history & /ai new)",
  async execute(bot, msg) {
    const replyChatId = msg.chat.id;

    if (!isAuthorized(replyChatId)) return;

    let dbChatId;
    if (msg.chat.type === "private") {
      dbChatId = msg.from.id;
    } else {
      dbChatId = `${msg.chat.id}:${msg.from.id}`;
    }

    const text = msg.text?.trim();

    if (!text || text === "/ai") {
      return bot.sendMessage(
        replyChatId,
        `*Welcome to AI Chat*

Type your question after \`/ai\`, for example:
\`/ai What is artificial intelligence?\`

*Other commands:*
• \`/ai history\` – View your previous messages  
• \`/ai new\` – Start a new conversation

_Your chat history is saved per user (and per group if in a group)._`,
        { parse_mode: "Markdown" }
      );
    }

    const modelId = privat(replyChatId) ? 1 : 2;

    const args = text.split(" ").slice(1);
    const input = args.join(" ");

    if (input.toLowerCase() === "history") {
      const history = getChatHistory(dbChatId);
      if (!history.length) {
        return bot.sendMessage(replyChatId, "There is no chat history yet.");
      }
      const buffer = Buffer.from(JSON.stringify(history, null, 2), "utf-8");
      await bot.sendDocument(
        replyChatId,
        buffer,
        {},
        { filename: "history.json", contentType: "application/json" }
      );
      return;
    }

    if (input.toLowerCase() === "new") {
      resetChat(dbChatId);
      return bot.sendMessage(replyChatId, "The conversation has been reset.");
    }

    try {
      const response = await sendMessageToGroq(dbChatId, input, modelId);
      if (!response) return bot.sendMessage(replyChatId, "Empty reply.");

      if (response.length > 4096) {
        for (let i = 0; i < response.length; i += 4096) {
          await bot.sendMessage(replyChatId, response.slice(i, i + 4096));
        }
      } else {
        bot.sendMessage(replyChatId, response, { parse_mode: "Markdown" });
      }
    } catch (err) {
      console.error("AI Error:", err);
      bot.sendMessage(replyChatId, "An error occurred while processing the request.");
    }
  },
};
