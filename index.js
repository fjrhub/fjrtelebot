const TelegramBot = require("node-telegram-bot-api");
const { handleCommand, handleCallback } = require("./handler");
require("dotenv").config();

const token = process.env.TOKEN;
const bot = new TelegramBot(token, { polling: true });

bot.on("message", (msg) => {handleCommand(bot, msg);});
bot.on("callback_query", (query) => {handleCallback(bot, query);});