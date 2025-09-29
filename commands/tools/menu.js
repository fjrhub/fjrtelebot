const fs = require("fs");
const path = require("path");
const { privat } = require("@/utils/helper");

function getCommandsByCategory(commandsPath) {
  let categories = {};
  const folders = fs.readdirSync(commandsPath);

  folders.forEach((folder) => {
    const folderPath = path.join(commandsPath, folder);
    if (fs.statSync(folderPath).isDirectory()) {
      const files = fs.readdirSync(folderPath).filter(f => f.endsWith(".js"));
      categories[folder.toLowerCase()] = files.map(f => f.replace(/\.js$/, ""));
    }
  });

  return categories;
}

// ⛔️ Exclude list
const exclude = {
  categories: ["downloader"],          // hide kategori downloader
  commands: {
    // contoh kalau mau hide sebagian
    downloader: ["auto", "ytm", "yt"], 
  }
};

function formatCategoryName(name) {
  return name
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

module.exports = {
  name: "menu",
  description: "Show available commands",
  execute(bot, msg) {
    const chatId = msg.chat.id;
    if (!privat(chatId)) {
      return bot.sendMessage(chatId, "You don't have permission.");
    }

    const commandsPath = path.join(process.cwd(), "commands");
    const commandsByCategory = getCommandsByCategory(commandsPath);

    let message = "📌 *Command Menu*\n\n";
    for (const [category, cmds] of Object.entries(commandsByCategory)) {
      // skip kalau kategori masuk blacklist
      if (exclude.categories.includes(category)) continue;

      message += `*${formatCategoryName(category)}*\n`;
      cmds
        .filter(c => !(exclude.commands[category] && exclude.commands[category].includes(c)))
        .forEach(c => {
          message += `/${c}\n`;
        });
      message += "\n";
    }

    bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
  },
};
