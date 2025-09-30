const { isAuthorized } = require("@/utils/helper");
const axios = require("axios");
const { InputFile } = require("grammy");

module.exports = {
  name: "ss",
  description: "Take website screenshot using Vreden API (with fallback to DIIOFFC)",
  async execute(ctx) {
    const chatId = ctx.chat.id;

    if (!isAuthorized(chatId)) return;

    let input = ctx.message.text?.split(" ").slice(1).join(" ").trim();
    if (!input) {
      return ctx.api.sendMessage(
        chatId,
        "❌ Please provide a website URL.\n\nExample: ss https://example.com",
        { parse_mode: "Markdown" }
      );
    }

    // Auto delete input message
    await ctx.api.deleteMessage(chatId, ctx.message.message_id);

    let statusMessage = null;

    const sendOrEditStatus = async (text) => {
      if (!statusMessage) {
        statusMessage = await ctx.api.sendMessage(chatId, text);
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

    const handleScreenshot = async (buffer) => {
      // Gunakan InputFile untuk mengirim buffer
      await ctx.api.sendPhoto(chatId, new InputFile(buffer, "screenshot.png"));
    };

    const screenshotVreden = async (url) => {
      const apiUrl = `${process.env.vreden}/api/ssweb?url=${encodeURIComponent(url)}&type=tablet`;
      const res = await axios.get(apiUrl, { responseType: "arraybuffer", timeout: 10000 });
      if (!res.data) throw new Error("API1 returned empty data.");
      return res.data;
    };

    const screenshotDiioffc = async (url) => {
      if (!/^https?:\/\//i.test(url)) {
        url = `https://${url}`;
      }
      const apiUrl = `${process.env.diioffc}/api/tools/sspc?url=${encodeURIComponent(url)}`;
      const res = await axios.get(apiUrl, { responseType: "arraybuffer", timeout: 10000 });
      if (!res.data) throw new Error("API2 returned empty data.");
      return res.data;
    };

    try {
      await sendOrEditStatus("📡 Trying API1 (Vreden)...");
      const buffer1 = await screenshotVreden(input);
      await handleScreenshot(buffer1);
      await deleteStatus();
      console.log("✅ Primary API (Vreden) success");
    } catch (err1) {
      console.error("❌ API1 failed:", err1.message);
      try {
        await sendOrEditStatus("📡 Trying API2 (DIIOFFC)...");
        const buffer2 = await screenshotDiioffc(input);
        await handleScreenshot(buffer2);
        await deleteStatus();
        console.log("✅ Fallback API (DIIOFFC) success");
      } catch (err2) {
        console.error("❌ API2 failed:", err2.message);
        await sendOrEditStatus("❌ Failed to take screenshot from both APIs.");
      }
    }
  },
};
