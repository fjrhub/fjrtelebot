const fs = require("fs");
const os = require("os");
const { execSync } = require("child_process");
const pkg = require("@/package.json");
const {
  privat,
  isAuthorized,
  getUptime,
  formatBytes,
  formatTime,
} = require("@/utils/helper");

module.exports = {
  name: "status",
  description: "Show bot status including uptime, memory, system, and platform",
  execute(bot, msg) {
    const chatId = msg.chat.id;

    if (
      !(
        (msg.chat.type === "private" && privat(msg.chat.id)) ||
        (msg.chat.type !== "private" &&
          (privat(msg.from.id) || isAuthorized(msg.from.id)))
      )
    )
      return;

    const uptime = getUptime();
    const mem = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const elapsedSec = process.uptime();

    const totalCpuMs = (cpuUsage.user + cpuUsage.system) / 1000;
    const cpuPercent = ((totalCpuMs / (elapsedSec * 1000)) * 100).toFixed(2);

    function getPrettyOS() {
      try {
        if (fs.existsSync("/etc/os-release")) {
          const data = fs.readFileSync("/etc/os-release", "utf8");
          const pretty = data.match(/PRETTY_NAME="(.+)"/);
          if (pretty) return `${pretty[1]} (${os.arch()})`;
        }

        try {
          const release = execSync("getprop ro.build.version.release")
            .toString()
            .trim();
          const arch = execSync("getprop ro.product.cpu.abi")
            .toString()
            .trim();
          if (release) return `Android ${release} (${arch})`;
        } catch (_) {}

        return `${os.type()} ${os.release()} (${os.arch()})`;
      } catch (e) {
        return `${os.type()} ${os.release()} (${os.arch()})`;
      }
    }

const message = `🤖 BOT STATUS
• Bot Uptime: ${uptime}
• System Uptime: ${formatTime(os.uptime())}
• Node.js: ${process.version}
• Platform: ${getPrettyOS()}
• Bot Version: ${pkg.version}
• CPU: ${os.cpus()[0].model} (${os.cpus().length} cores)
• CPU Usage: ${cpuPercent}%
• RAM Total: ${formatBytes(os.totalmem())}
• RAM Free: ${formatBytes(os.freemem())}
• RSS: ${formatBytes(mem.rss)}
• Heap Total: ${formatBytes(mem.heapTotal)}
• Heap Used: ${formatBytes(mem.heapUsed)}
• External: ${formatBytes(mem.external)}
`;
    try {
      bot.sendMessage(chatId, message);
    } catch (err) {
      console.error("Failed to send status:", err);
    }
  },
};
