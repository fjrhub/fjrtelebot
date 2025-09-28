const fs = require("fs");
const path = require("path");

const commands = new Map();

// 🔁 Recursively load all command files from folders and subfolders
function loadCommands(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      loadCommands(fullPath);
    } else if (file.endsWith(".js")) {
      const command = require(fullPath);

      if (command.name && typeof command.execute === "function") {
        commands.set(command.name, command);
      }
    }
  }
}

// 🔃 Load all commands on startup
loadCommands(path.join(__dirname, "commands"));

// 🔧 Handle normal messages (text)
async function handleMessage(bot, msg) {
  if (!msg.text) return;

  if (msg.text.startsWith("/")) {
    return handleCommand(bot, msg); // If message is a command
  }

  // If it's not a command, try auto detection (e.g., TikTok links)
  const autoHandler = commands.get("auto");
  if (autoHandler) {
    try {
      await autoHandler.execute(bot, msg);
    } catch (err) {
      console.error("❌ Auto handler error:", err.message);
    }
  }
}

// 🛠️ Handle /commands (e.g. /start, /tt)
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

// 🎯 Handle Inline Button Callback Queries
function handleCallback(bot, query) {
  const data = query.data;
  const [commandPrefix] = data.split(":");

  const command = commands.get(commandPrefix);
  if (!command || typeof command.handleCallback !== "function") {
    return bot.answerCallbackQuery(query.id, { text: "Unrecognized action." });
  }

  try {
    command.handleCallback(bot, query);
  } catch (err) {
    console.error(`Error in callback "${data}"`, err);
    bot.answerCallbackQuery(query.id, { text: "An error occurred while processing the action." });
  }
}

module.exports = { handleMessage, handleCommand, handleCallback };
