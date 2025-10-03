require("dotenv").config();
require("module-alias/register");
require("@/utils/api");
const { Bot } = require("grammy");
const { OWNER_ID, getWIBTime } = require("@/utils/helper");
const { handleCallback, handleMessage } = require("@/handler");

if (process.env.NODE_ENV === "development") {
  console.log("Running in development mode...");
  console.log("Debug log active 🚀");
}

const bot = new Bot(process.env.TOKEN);
bot.on("message", (ctx) => handleMessage(ctx));
bot.on("callback_query:data", (ctx) => handleCallback(ctx));
bot.api.sendMessage(OWNER_ID,`Bot is now online!\nStarted at: ${getWIBTime()} WIB`);
bot.start();