const fs = require("fs");
const path = require("path");

const commands = new Map();

// 🔁 Recursively load all command files
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

loadCommands(path.join(__dirname, "commands"));

// 🔧 Handle normal messages
async function handleMessage(ctx) {
  if (!ctx.message?.text) return;

  const text = ctx.message.text;

  if (text.startsWith("/")) {
    return handleCommand(ctx); // If it's a command
  }

  // auto detection (contoh: TikTok link)
  const autoHandler = commands.get("auto");
  if (autoHandler) {
    try {
      await autoHandler.execute(ctx);
    } catch (err) {
      console.error("❌ Auto handler error:", err.message);
    }
  }
}

// 🛠️ Handle /commands
function handleCommand(ctx) {
  const text = ctx.message.text;
  if (!text.startsWith("/")) return;

  const args = text.slice(1).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();
  const command = commands.get(commandName);
  if (!command) return;

  try {
    command.execute(ctx, args);
  } catch (err) {
    console.error(`Error in command "${commandName}"`, err);
    ctx.reply("⚠️ Terjadi error saat menjalankan command.");
  }
}

// 🎯 Handle Inline Button Callback Queries
function handleCallback(ctx) {
  const data = ctx.callbackQuery?.data;
  if (!data) return;

  const [commandPrefix] = data.split(":");
  const command = commands.get(commandPrefix);

  if (!command || typeof command.handleCallback !== "function") {
    return ctx.answerCallbackQuery({ text: "❌ Aksi tidak dikenali." });
  }

  try {
    command.handleCallback(ctx);
  } catch (err) {
    console.error(`Error in callback "${data}"`, err);
    ctx.answerCallbackQuery({ text: "⚠️ Terjadi error saat memproses aksi." });
  }
}

module.exports = { handleMessage, handleCommand, handleCallback };
