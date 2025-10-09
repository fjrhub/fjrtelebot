const { privat, getUptime, formatBytes } = require("@/utils/helper");

module.exports = {
  name: "status",
  description: "Show bot status including uptime and memory usage",
  execute(bot, msg) {
    const chatId = msg.chat.id;

    if (!privat(chatId)) {
      return bot.sendMessage(chatId, "You don't have permission.");
    }

    const uptime = getUptime();
    const mem = process.memoryUsage();

    const message = `🤖 Bot Status:
• Uptime: ${uptime}
• Memory:
   - RSS: ${formatBytes(mem.rss)}
   - Heap Total: ${formatBytes(mem.heapTotal)}
   - Heap Used: ${formatBytes(mem.heapUsed)}
   - External: ${formatBytes(mem.external)}`;

    bot.sendMessage(chatId, message);
  },
};
