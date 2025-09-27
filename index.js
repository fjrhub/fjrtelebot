const TelegramBot = require("node-telegram-bot-api");
const { handleCommand } = require("./handler");
require('dotenv').config();

const token = process.env.TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Gunakan handler saat pesan masuk
bot.on("message", (msg) => {
  handleCommand(bot, msg);
});

