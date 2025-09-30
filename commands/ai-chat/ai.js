const {
  sendMessageToGroq,
  getChatHistory,
  resetChat,
} = require("@/utils/groq");

const { isAuthorized, privat } = require("@/utils/helper");
const { InputFile } = require("grammy");

module.exports = {
  name: "ai",
  description:
    "Chat with AI using Groq (supports memory, /ai history & /ai new)",

  async execute(ctx, args) {
    const replyChatId = ctx.chat.id;

    if (!isAuthorized(replyChatId)) return;

    // ID untuk penyimpanan history
    let dbChatId;
    if (ctx.chat.type === "private") {
      dbChatId = ctx.from.id;
    } else {
      dbChatId = `${ctx.chat.id}:${ctx.from.id}`;
    }

    const text = ctx.message.text?.trim();
    if (!text || text === "/ai") {
      return ctx.reply(
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
    const input = args.join(" ");

    // 🗂️ /ai history
    if (input.toLowerCase() === "history") {
      const history = getChatHistory(dbChatId);
      if (!history.length) {
        await ctx.reply("There is no chat history yet.");
      } else {
        const buffer = Buffer.from(JSON.stringify(history, null, 2), "utf-8");
        await ctx.replyWithDocument(new InputFile(buffer, "history.json"));
      }

      setTimeout(() => {
        ctx.api.deleteMessage(replyChatId, ctx.message.message_id).catch(() => {});
      }, 1000);

      return;
    }

    // 🔄 /ai new
    if (input.toLowerCase() === "new") {
      resetChat(dbChatId);
      const sentMsg = await ctx.reply("The conversation has been reset.");

      setTimeout(() => {
        ctx.api.deleteMessage(replyChatId, ctx.message.message_id).catch(() => {});
      }, 1000);

      setTimeout(() => {
        ctx.api.deleteMessage(replyChatId, sentMsg.message_id).catch(() => {});
      }, 5000);

      return;
    }

    // 🤖 Chat ke Groq
    try {
      const response = await sendMessageToGroq(dbChatId, input, modelId);
      if (!response) return ctx.reply("Empty reply.");

      if (response.length > 4096) {
        for (let i = 0; i < response.length; i += 4096) {
          await ctx.reply(response.slice(i, i + 4096));
        }
      } else {
        ctx.reply(response, { parse_mode: "Markdown" });
      }
    } catch (err) {
      console.error("AI Error:", err);
      ctx.reply("An error occurred while processing the request.");
    }
  },
};
