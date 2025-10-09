const { privat, isAuthorized } = require("@/utils/helper");
const { setModel } = require("@/utils/modelSelect");

module.exports = {
  name: "model",
  description: "Choose and switch Groq model",

  async execute(ctx) {
    const chatId = ctx.chat.id;
    if (!isAuthorized(chatId)) return;

    const modelChoices = [
      { label: "1", id: "allam-2-7b" },
      { label: "2", id: "compound-beta" },
      { label: "3", id: "compound-beta-mini" },
      { label: "4", id: "deepseek-r1-distill-llama-70b" },
      { label: "5", id: "gemma2-9b-it" },
      { label: "6", id: "llama-3.1-8b-instant" },
      { label: "7", id: "llama-3.3-70b-versatile" },
      { label: "8", id: "llama3-70b-8192" },
      { label: "9", id: "llama3-8b-8192" },
      { label: "10", id: "meta-llama/llama-4-maverick-17b-128e-instruct" },
      { label: "11", id: "meta-llama/llama-4-scout-17b-16e-instruct" },
      { label: "12", id: "meta-llama/llama-guard-4-12b" },
      { label: "13", id: "meta-llama/llama-prompt-guard-2-22m" },
      { label: "14", id: "meta-llama/llama-prompt-guard-2-86m" },
      { label: "15", id: "mistral-saba-24b" },
      { label: "16", id: "qwen-qwq-32b" },
      { label: "17", id: "qwen/qwen3-32b" },
    ];

    const listText = modelChoices.map((m) => `${m.label}. ${m.id}`).join("\n");
    const perRow = 5;
    const buttons = [];
    for (let i = 0; i < modelChoices.length; i += perRow) {
      buttons.push(
        modelChoices.slice(i, i + perRow).map((m) => ({
          text: m.label,
          callback_data: `model:${m.id}`,
        }))
      );
    }

    const sentMsg = await ctx.reply(`🔧 *Choose the model you want to use:*\n\n${listText}`, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: buttons },
    });

    // hapus pesan user dan menu otomatis
    setTimeout(() => ctx.deleteMessage(ctx.message.message_id).catch(() => {}), 1000);
    setTimeout(() => ctx.deleteMessage(sentMsg.message_id).catch(() => {}), 30000);
  },

  async handleCallback(ctx) {
    const chatId = ctx.chat.id;
    const data = ctx.callbackQuery.data;
    const modelId = data.split(":")[1];
    const role = privat(chatId) ? "privat" : "authorized";

    try {
      const sentMsg = await ctx.reply(`✅ Model for *${role}* updated to:\n*${modelId}*`, {
        parse_mode: "Markdown",
      });

      // hapus pesan lama dan konfirmasi otomatis
      setTimeout(() => ctx.deleteMessage(ctx.callbackQuery.message.message_id).catch(() => {}), 1000);
      setTimeout(() => ctx.deleteMessage(sentMsg.message_id).catch(() => {}), 30000);

      setModel(role, modelId);
    } catch (err) {
      const errMsg = await ctx.reply(`❌ Failed to update model: ${err.message}`);
      setTimeout(() => ctx.deleteMessage(errMsg.message_id).catch(() => {}), 30000);
    }

    await ctx.answerCallbackQuery();
  },
};
