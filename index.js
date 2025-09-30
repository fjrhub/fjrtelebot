require("dotenv").config();
require("module-alias/register");
const { Bot } = require("grammy");
const { OWNER_ID, getWIBTime } = require("@/utils/helper");
const { handleCallback, handleMessage } = require("@/handler");

const bot = new Bot(process.env.BOT_TOKEN);
bot.on("message", ctx => handleMessage(ctx));
bot.on("callback_query:data", ctx => handleCallback(ctx));
bot.api.sendMessage(OWNER_ID, `Bot is now online!\nStarted at: ${getWIBTime()} WIB`);
bot.start();