const fs = require("fs");
const os = require("os");
const { privat, getUptime, formatBytes } = require("@/utils/helper");

function getPrettyOS() {
  try {
    const data = fs.readFileSync("/etc/os-release", "utf8");
    const pretty = data.match(/PRETTY_NAME="(.+)"/);
    const arch = os.arch(); // contoh: x64, arm64, aarch64
    return pretty ? `${pretty[1]} (${arch})` : `${os.type()} ${os.release()} (${arch})`;
  } catch (e) {
    return `${os.type()} ${os.release()} (${os.arch()})`;
  }
}

module.exports = {
  name: "status",
  description: "Show bot status including uptime, memory, and platform",
  execute(bot, msg) {
    const chatId = msg.chat.id;
    if (!privat(chatId)) return;

    const uptime = getUptime();
    const mem = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const elapsedSec = process.uptime();

    // Hitung CPU usage %
    const totalCpuMs = (cpuUsage.user + cpuUsage.system) / 1000; // µs → ms
    const cpuPercent = ((totalCpuMs / (elapsedSec * 1000)) * 100).toFixed(2);

    const message = `BOT STATUS
• Uptime: ${uptime}
• Node.js: ${process.version}
• Platform: ${getPrettyOS()}
• RSS: ${formatBytes(mem.rss)}
• Heap Total: ${formatBytes(mem.heapTotal)}
• Heap Used: ${formatBytes(mem.heapUsed)}
• External: ${formatBytes(mem.external)}
• Usage: ${cpuPercent}%`;

    bot.sendMessage(chatId, message);
  },
};
