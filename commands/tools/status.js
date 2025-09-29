const fs = require("fs");
const os = require("os");
const { execSync } = require("child_process");
const { privat, isAuthorized, getUptime, formatBytes, } = require("@/utils/helper");

module.exports = {
  name: "status",
  description: "Show bot status including uptime, memory, and platform",
  execute(bot, msg) {
    const chatId = msg.chat.id;
    const fromId = msg.from?.id;
    const chatType = msg.chat.type;

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
          const arch = execSync("getprop ro.product.cpu.abi").toString().trim();
          if (release) return `Android ${release} (${arch})`;
        } catch (_) {}

        return `${os.type()} ${os.release()} (${os.arch()})`;
      } catch (e) {
        return `${os.type()} ${os.release()} (${os.arch()})`;
      }
    }

    const message = `BOT STATUS
• Uptime: ${uptime}
• Node.js: ${process.version}
• Platform: ${getPrettyOS()}
• RSS: ${formatBytes(mem.rss)}
• Heap Total: ${formatBytes(mem.heapTotal)}
• Heap Used: ${formatBytes(mem.heapUsed)}
• External: ${formatBytes(mem.external)}
• Usage: ${cpuPercent}%
`;
    bot.sendMessage(chatId, message);
  },
};
