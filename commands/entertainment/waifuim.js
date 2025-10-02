const { isAuthorized } = require("@/utils/helper");
const axios = require("axios");

module.exports = {
  name: "waifuim",
  description: "Get a random waifu image from the API WaifuIM",
  async execute(ctx) {
    const chatId = ctx.chat.id;
    if (!isAuthorized(chatId)) return;

    try {
      const response = await axios.get(
        createUrl("waifuim", "/search?included_tags=waifu"),
        { timeout: 8000 }
      );

      const imageUrl = response.data?.images?.[0]?.url;

      if (!imageUrl) {
        return ctx.reply("❌ Failed to retrieve a valid image from WaifuIM.");
      }

      await ctx.replyWithPhoto(imageUrl);
    } catch {
      await ctx.reply("❌ Failed to retrieve data from WaifuIM.");
    }
  },
};
