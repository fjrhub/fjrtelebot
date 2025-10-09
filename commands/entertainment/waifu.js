const { isAuthorized } = require("@/utils/helper");
const axios = require("axios");
const tools = require("@/utils/api");

module.exports = {
  name: "waifu",
  description: "Get a random waifu image from two fallback APIs",
  async execute(ctx) {
    const chatId = ctx.chat.id;
    if (!isAuthorized(chatId)) return;

    let statusMessage = null;

    const sendOrEditStatus = async (text) => {
      if (!statusMessage) {
        statusMessage = await ctx.reply(text);
      } else {
        await ctx.api.editMessageText(chatId, statusMessage.message_id, text);
      }
    };

    const deleteStatus = async () => {
      if (statusMessage) {
        await new Promise((res) => setTimeout(res, 1000));
        await ctx.api.deleteMessage(chatId, statusMessage.message_id);
        statusMessage = null;
      }
    };

    const sendPhoto = async (url) => {
      await ctx.replyWithPhoto(url);
      await deleteStatus();
    };

    try {
      await sendOrEditStatus("📡 Trying API 1...");
      const res1 = await axios.get(tools.createUrl("waifupics", "/sfw/waifu"), {
        timeout: 8000,
      });
      const imageUrl1 = res1.data?.url;
      if (!imageUrl1) throw new Error("API 1 returned an invalid response.");
      await sendPhoto(imageUrl1);
    } catch {
      try {
        await sendOrEditStatus("📡 Trying API 2...");
        const res2 = await axios.get(
          tools.createUrl("waifuim", "/search?included_tags=waifu"),
          { timeout: 8000 }
        );
        const imageUrl2 = res2.data?.images?.[0]?.url;
        if (!imageUrl2) throw new Error("API 2 returned an invalid response.");
        await sendPhoto(imageUrl2);
      } catch {
        await sendOrEditStatus("❌ Failed to fetch images from both APIs.");
      }
    }
  },
};
