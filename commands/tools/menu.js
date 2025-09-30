const fs = require("fs");
const path = require("path");
const { privat } = require("@/utils/helper");

module.exports = {
  name: "menu",
  description: "Show available commands",
  async execute(ctx) {
    const chatId = ctx.chat.id;
    if (!privat(chatId)) {
      return ctx.reply("You don't have permission.");
    }

    function getCommandsByCategory(commandsPath) {
      let categories = {};
      const folders = fs.readdirSync(commandsPath);

      folders.forEach((folder) => {
        const folderPath = path.join(commandsPath, folder);
        if (fs.statSync(folderPath).isDirectory()) {
          const files = fs
            .readdirSync(folderPath)
            .filter((f) => f.endsWith(".js"));
          categories[folder.toLowerCase()] = files.map((f) =>
            f.replace(/\.js$/, "")
          );
        }
      });

      return categories;
    }

    // ⛔️ Exclude list
    const exclude = {
      categories: ["downloader"], // hide kategori downloader
      commands: {
        downloader: ["auto", "ytm", "yt"],
      },
    };

    function formatCategoryName(name) {
      return name
        .split(/[-_]/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    }

    const commandsPath = path.join(process.cwd(), "commands");
    const commandsByCategory = getCommandsByCategory(commandsPath);

    let message = "📌 *Command Menu*\n\n";
    for (const [category, cmds] of Object.entries(commandsByCategory)) {
      if (exclude.categories.includes(category)) continue;

      message += `*${formatCategoryName(category)}*\n`;
      cmds
        .filter(
          (c) =>
            !(
              exclude.commands[category] &&
              exclude.commands[category].includes(c)
            )
        )
        .forEach((c) => {
          message += `/${c}\n`;
        });
      message += "\n";
    }

    await ctx.reply(message, { parse_mode: "Markdown" });
  },
};
