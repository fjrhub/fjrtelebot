const fs = require("fs");
const os = require("os");
const { execSync } = require("child_process");
const { privat, getUptime, formatBytes } = require("@/utils/helper");

function getPrettyOS() {
  try {
    // Linux distro (Debian, Ubuntu, dll)
    if (fs.existsSync("/etc/os-release")) {
      const data = fs.readFileSync("/etc/os-release", "utf8");
      const pretty = data.match(/PRETTY_NAME="(.+)"/);
      if (pretty) return `${pretty[1]} (${os.arch()})`;
    }

    // Android (via getprop di Termux)
    try {
      const release = execSync("getprop ro.build.version.release").toString().trim();
      const arch = execSync("getprop ro.product.cpu.abi").toString().trim();
      if (release) return `Android ${release} (${arch})`;
    } catch (_) {
      // abaikan kalau getprop gagal
    }

    // Default fallback (Linux/Windows)
    return `${os.type()} ${os.release()} (${os.arch()})`;
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

    const message = `🤖 BOT STATUS
━━━━━━━━━━━━━━━
📌 Info Bot:
• Uptime: ${uptime}
• Node.js: ${process.version}
• Platform: ${getPrettyOS()}

💾 Memory:
• RSS: ${formatBytes(mem.rss)}
• Heap Total: ${formatBytes(mem.heapTotal)}
• Heap Used: ${formatBytes(mem.heapUsed)}
• External: ${formatBytes(mem.external)}

⚡ CPU:
• Usage: ${cpuPercent}%
━━━━━━━━━━━━━━━`;

    bot.sendMessage(chatId, message);
  },
};
