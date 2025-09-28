const TelegramBot = require("node-telegram-bot-api");
require("module-alias/register");
require("dotenv").config();

const { handleCallback, handleMessage } = require("@/handler");

const bot = new TelegramBot(process.env.TOKEN, { polling: true });

bot.on("message", (msg) => handleMessage(bot, msg));
bot.on("callback_query", (query) => handleCallback(bot, query));