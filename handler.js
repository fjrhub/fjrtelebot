const fs = require("fs");
const path = require("path");
const { checkAnswer } = require("@/utils/games");

const commands = new Map();

// 🔁 Load all commands
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
        // Simpan command utama
        commands.set(command.name, command);

        // ✅ Tambahkan alias jika ada
        if (Array.isArray(command.aliases)) {
          for (const alias of command.aliases) {
            commands.set(alias, command);
          }
        }
      }
    }
  }
}

loadCommands(path.join(__dirname, "commands"));

// 🔧 Handle pesan
async function handleMessage(ctx) {
  if (!ctx.message?.text) return;
  const text = ctx.message.text;

  // Jika command
  if (text.startsWith("/")) {
    return handleCommand(ctx);
  }

  // Auto detection
  const autoHandler = commands.get("auto");
  if (autoHandler) {
    try {
      await autoHandler.execute(ctx);
    } catch (err) {
      console.error("❌ Auto handler error:", err.message);
    }
  }

  // 🔎 Check game answers
  await checkAnswer(ctx);
}

// 🔨 Handle command
function handleCommand(ctx) {
  const text = ctx.message.text;
  if (!text.startsWith("/")) return;

  const args = text.slice(1).trim().split(/ +/);
  let commandName = args.shift().toLowerCase();

  // Jika user menulis seperti /delete@BotName
  const atIndex = commandName.indexOf("@");
  if (atIndex !== -1) {
    commandName = commandName.slice(0, atIndex);
  }

  const command = commands.get(commandName);
  if (!command) return;

  if (command.strict && args.length > 0) {
    return;
  }

  try {
    command.execute(ctx, args);
  } catch (err) {
    console.error(`Error in command "${commandName}"`, err);
    ctx.reply("⚠️ An error occurred while executing the command.");
  }
}

// 🎯 Handle callback
async function handleCallback(ctx) {
  const query = ctx.callbackQuery;
  if (!query) return;

  const data = query.data;
  if (!data) return;

  const [commandPrefix] = data.split(":");
  const command = commands.get(commandPrefix);

  if (!command || typeof command.handleCallback !== "function") {
    return ctx.answerCallbackQuery({ text: "❌ Unrecognized action." });
  }

  try {
    if (!query.message) {
      return ctx.answerCallbackQuery({ text: "⚠️ Cannot handle inline message." });
    }

    await command.handleCallback(ctx, query);
  } catch (err) {
    console.error(`Error in callback "${data}"`, err);
    ctx.answerCallbackQuery({ text: "⚠️ An error occurred while processing the action." });
  }
}

module.exports = { handleMessage, handleCommand, handleCallback };
