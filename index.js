const { Bot } = require("grammy");
require("dotenv").config();
const { OWNER_ID, getWIBTime } = require("./utils/helper");

const bot = new Bot(process.env.TOKEN);

bot.api.sendMessage(OWNER_ID, `Bot is now online!\nStarted at: ${getWIBTime()} WIB`);