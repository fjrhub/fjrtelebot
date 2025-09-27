const fs = require("fs");
const path = require("path");

const commands = new Map();

// Recursive: load all command files from folders & subfolders
function loadCommands(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      loadCommands(fullPath); // 🔁 folder if, enter deeper
    } else if (file.endsWith(".js")) {
      const command = require(fullPath);

      if (command.name && typeof command.execute === "function") {
        commands.set(command.name, command);
      }
    }
  }
}

// Run the loader from the 'commands/' folder
loadCommands(path.join(__dirname, "commands"));

// 🔽 Handler Command as usual
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
    bot.sendMessage(msg.chat.id, "An error occurs when running orders.");
  }
}

// 🔽 Handler Callback (if you use the Inline button)
function handleCallback(bot, query) {
  const data = query.data;
  const [commandPrefix] = data.split(":");

  const command = commands.get(commandPrefix);
  if (!command || typeof command.handleCallback !== "function") {
    return bot.answerCallbackQuery(query.id, { text: "The action was not recognized." });
  }

  try {
    command.handleCallback(bot, query);
  } catch (err) {
    console.error(`Error in callback "${data}"`, err);
    bot.answerCallbackQuery(query.id, { text: "There is an error." });
  }
}

module.exports = { handleCommand, handleCallback };
