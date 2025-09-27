const fs = require("fs");
const path = require("path");

const commands = new Map();

// Load all command modules
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
  } catch (err) {
    console.error(`Error in command "${commandName}"`, err);
    bot.sendMessage(msg.chat.id, "An error occurred while executing the command.");
  }
}

function handleCallback(bot, query) {
  const data = query.data;
  const [commandPrefix] = data.split(":");

  const command = commands.get(commandPrefix);
  if (!command || !command.handleCallback) {
    // Answer anyway to avoid infinite loading
    return bot.answerCallbackQuery(query.id, { text: "Invalid or unknown action." });
  }

  try {
    command.handleCallback(bot, query);
  } catch (err) {
    console.error(`Error in callback "${data}"`, err);
    bot.answerCallbackQuery(query.id, { text: "Something went wrong." });
  }
}

module.exports = { handleCommand, handleCallback };
