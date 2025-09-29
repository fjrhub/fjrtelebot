const fs = require("fs");
const path = require("path");
const { privat } = require("@/utils/helper");

module.exports = {
  name: "menu",
  description: "Show available commands",
  execute(bot, msg) {
    const chatId = msg.chat.id;
    if (!privat(chatId)) {
      return bot.sendMessage(chatId, "You don't have permission.");
    }

    // exclude list: category -> [commands]
    const exclude = {
      downloader: ["auto", "ytm", "yt"],
    };

    const commandsPath = path.join(process.cwd(), "commands");
    const commandsByCategory = getCommandsByCategory(commandsPath);

    function getCommandsByCategory(commandsPath) {
      let categories = {};
      const folders = fs.readdirSync(commandsPath);

      folders.forEach((folder) => {
        const folderPath = path.join(commandsPath, folder);
        if (fs.statSync(folderPath).isDirectory()) {
          const files = fs
            .readdirSync(folderPath)
            .filter((f) => f.endsWith(".js"));
          categories[folder] = files.map((f) => f.replace(/\.js$/, ""));
        }
      });

      return categories;
    }

    let message = "📌 *Command Menu*\n\n";
    for (const [category, cmds] of Object.entries(commandsByCategory)) {
      message += `*${category.charAt(0).toUpperCase() + category.slice(1)}*\n`;
      cmds
        .filter((c) => !(exclude[category] && exclude[category].includes(c)))
        .forEach((c) => {
          message += `/${c}\n`;
        });
      message += "\n";
    }

    bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
  },
};
