const { privat } = require("@/utils/helper");
const { updateGroqModel } = require("@/utils/supabase");

module.exports = {
  name: "model",
  description: "Choose and switch Groq model",
  async execute(bot, msg) {
    const chatId = msg.chat.id;

    if (!privat(chatId)) {
      return bot.sendMessage(chatId, "❌ You don't have permission.");
    }

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
      { label: "17", id: "qwen/qwen3-32b" }
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

    await bot.sendMessage(chatId, `🔧 *Choose the model you want to use:*\n\n${listText}`, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: buttons,
      },
    });
  },

  async handleCallback(bot, query) {
    const chatId = query.message.chat.id;
    const data = query.data;
    const modelId = data.split(":")[1];

    const error = await updateGroqModel(modelId);

    if (error) {
      await bot.sendMessage(chatId, `❌ Failed to update model: ${error.message}`);
    } else {
      await bot.sendMessage(chatId, `✅ Model updated to:\n*${modelId}*`, {
        parse_mode: "Markdown",
      });
    }

    await bot.answerCallbackQuery(query.id);
  },
};
