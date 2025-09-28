const os = require("os");
const { privat, getUptime, formatBytes } = require("@/utils/helper");

module.exports = {
  name: "status",
  description: "Show bot status including uptime, memory, and system info",
  execute(bot, msg) {
    const chatId = msg.chat.id;
    if (!privat(chatId)) return;

    const uptime = getUptime();
    const mem = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const elapsedSec = process.uptime();

    const totalCpuMs = (cpuUsage.user + cpuUsage.system) / 1000; // µs → ms
    const cpuPercent = ((totalCpuMs / (elapsedSec * 1000)) * 100).toFixed(2);

    const message = `🤖 BOT STATUS
• Uptime: ${uptime}
• Node.js: ${process.version}
• Platform: ${os.type()} ${os.release()}
• RSS: ${formatBytes(mem.rss)}
• Heap Total: ${formatBytes(mem.heapTotal)}
• Heap Used: ${formatBytes(mem.heapUsed)}
• External: ${formatBytes(mem.external)}
• Usage: ${cpuPercent}%
`;

    bot.sendMessage(chatId, message);
  },
};
