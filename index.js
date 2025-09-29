const TelegramBot = require("node-telegram-bot-api");
require("module-alias/register");
require("dotenv").config();
const { OWNER_ID, getWIBTime } = require("@/utils/helper");

const { handleCallback, handleMessage } = require("@/handler");

const bot = new TelegramBot(process.env.TOKEN, { polling: true });

bot.on("message", (msg) => handleMessage(bot, msg));
bot.on("callback_query", (query) => handleCallback(bot, query));
bot.sendMessage(OWNER_ID,`Bot is now online!\nStarted at: ${getWIBTime()} WIB`);