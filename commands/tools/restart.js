const fs = require("fs");
const { exec } = require("child_process");
const { privat } = require("@/utils/helper");

module.exports = {
  name: "restart",
  description: "Check repo update & restart bot if needed",

  async execute(ctx) {
    const chatId = ctx.chat.id;
    if (!privat(chatId)) return;

    const msg = await ctx.reply("🔄 Checking for updates...");

    exec("git fetch && git diff --quiet HEAD origin/main", async (error) => {
      try {
        if (!error) {
          await ctx.api.editMessageText(
            chatId,
            msg.message_id,
            "✅ No updates found. Bot keeps running normally."
          );
        } else {
          fs.writeFileSync("restart.flag", "");
          await ctx.api.editMessageText(
            chatId,
            msg.message_id,
            "♻️ Update found! Restart triggered. Bot will update and restart shortly..."
          );
        }
      } catch (err) {
        console.error("Edit message error:", err);
        await ctx.reply("❌ Failed while checking updates.");
      }
    });
  },
};
