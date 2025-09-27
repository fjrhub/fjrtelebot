const fs = require("fs");
const path = require("path");

const commands = new Map();

// Load semua file di folder command/
const commandFiles = fs.readdirSync(path.join(__dirname, "command")).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(`./command/${file}`);
  commands.set(command.name, command);
}

function handleCommand(bot, msg) {
  const text = msg.text;
  if (!text || !text.startsWith("/")) return;

  const args = text.slice(1).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = commands.get(commandName);
  if (!command) return;

  try {
    command.execute(bot, msg, args);
  } catch (error) {
    console.error(`Gagal menjalankan command ${commandName}`, error);
    bot.sendMessage(msg.chat.id, "Terjadi kesalahan saat menjalankan command.");
  }
}

module.exports = { handleCommand };

