const fs = require("fs");
const path = require("path");

const commands = new Map();
const activeBrainTeaser = {}; // 🧠 simpan state game per chat

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

  // 🧠 Brain Teaser Answer Check
  if (activeBrainTeaser[ctx.chat.id]) {
    const userAnswer = text.trim().toLowerCase();
    const correctAnswer = activeBrainTeaser[ctx.chat.id].answer.toLowerCase();

    if (userAnswer === correctAnswer) {
      await ctx.reply(
        `✅ Correct! ${ctx.from.first_name} got it right!\nThe answer is *${activeBrainTeaser[ctx.chat.id].answer}*`,
        { parse_mode: "Markdown" }
      );
      delete activeBrainTeaser[ctx.chat.id];
      return;
    }
  }

  // 🔍 Jika command
  if (text.startsWith("/")) {
    return handleCommand(ctx);
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
    command.execute(ctx, args, activeBrainTeaser); // 🧩 lempar state ke command
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

module.exports = { handleMessage, handleCommand, handleCallback, activeBrainTeaser };
