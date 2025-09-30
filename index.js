require("dotenv").config();
require("module-alias/register");
const { Bot } = require("grammy");
const { OWNER_ID, getWIBTime } = require("@/utils/helper");

const bot = new Bot(process.env.BOT_TOKEN);

bot.api.sendMessage(OWNER_ID, `Bot is now online!\nStarted at: ${getWIBTime()} WIB`);