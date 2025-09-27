require('dotenv').config();

// Convert from .env
const allowedChatId = process.env.GC
  .split(',')
  .map(id => Number(id.trim()));

const OWNER_ID = allowedChatId[1];
const GROUP_ID = allowedChatId[0];

const PRIVATE = process.env.PRIVATE;

// Check if chatId is among the allowed ones
const isAuthorized = (chatId) => allowedChatId.includes(Number(chatId));

// Check if chatId is the same as the private ID from the API
const privat = (chatId) => chatId.toString() === PRIVATE;

// Time format to WIB
const getWIBTime = () => {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date()).replace(/\//g, '/').replace(',', '');
};

module.exports = {
  OWNER_ID,
  GROUP_ID,
  isAuthorized,
  privat,
  getWIBTime
};

