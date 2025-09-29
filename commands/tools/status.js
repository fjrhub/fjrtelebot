const fs = require("fs");
const os = require("os");
const { execSync } = require("child_process");
const {
  privat,
  isAuthorized,
  getUptime,
  formatBytes,
  formatTime,
} = require("@/utils/helper");

module.exports = {
  name: "status",
  description: "Show bot status including uptime, memory, system, platform, and ping",

  getCPUInfo() {
    try {
      const cpus = os.cpus();
      if (cpus && cpus.length > 0 && cpus[0].model) {
        return `${cpus[0].model} (${cpus.length} cores @ ${cpus[0].speed}MHz)`;
      }

      const socModel = execSync("getprop ro.soc.model").toString().trim();
      const platform = execSync("getprop ro.board.platform").toString().trim();
      const hardware = execSync("getprop ro.hardware").toString().trim();

      return `${socModel || "Unknown SoC"} (${hardware || "?"}, ${
        platform || "?"
      })`;
    } catch {
      return "Unknown CPU";
    }
  },

  getPrettyOS() {
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
    } catch {
      return `${os.type()} ${os.release()} (${os.arch()})`;
    }
  },

  getPing(host = "8.8.8.8") {
    try {
      const output = execSync(`ping -c 1 -w 1 ${host}`).toString();
      const match = output.match(/time=([\d.]+) ms/);
      if (match) return `${match[1]} ms`;
      return "Timeout";
    } catch {
      return "Unreachable";
    }
  },

  async execute(bot, msg) {
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

    const pingResult = this.getPing("8.8.8.8");

    const message = `BOT STATUS
• Ping: ${pingResult}
• Bot Uptime: ${uptime}
• System Uptime: ${formatTime(os.uptime())}
• Node.js: ${process.version}
• Platform: ${this.getPrettyOS()}
• CPU: ${this.getCPUInfo()}
• CPU Usage: ${cpuPercent}%
• RAM: ${formatBytes(os.freemem())} / ${formatBytes(os.totalmem())}
• RSS: ${formatBytes(mem.rss)}
• Heap: ${formatBytes(mem.heapUsed)} / ${formatBytes(mem.heapTotal)}
`;

    try {
      await bot.sendMessage(chatId, message);
    } catch (err) {
      console.error("Failed to send status:", err);
    }
  },
};
