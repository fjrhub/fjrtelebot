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

// Get detailed parts of Jakarta time including weekday in English
const getJakartaTimeParts = () => {
  const now = new Date();

  // Get weekday in English
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
  }).format(now); // Example: "Sunday"

  // Format full date and time using Indonesian format
  const formattedTime = getWIBTime(); // Example: "13/07/2025 19.42"

  const [datePart, timePart] = formattedTime.split(' ');
  const [day, month, year] = datePart.split('/');
  const [hour, minute] = timePart.split('.');

  return {
    weekday,            // e.g. "Sunday"
    year,
    month,
    day,
    currentTime: `${hour}:${minute}`, // e.g. "19:42"
  };
};


const startTime = Date.now();

function getUptime() {
  const now = Date.now();
  const diff = now - startTime;
  return formatDuration(diff);
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / 1000 / 60) % 60;
  const hours = Math.floor(ms / 1000 / 60 / 60) % 24;
  const days = Math.floor(ms / 1000 / 60 / 60 / 24);

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    ++i;
  }
  return `${bytes.toFixed(2)} ${units[i]}`;
}

function formatTime(seconds) {
  const d = Math.floor(seconds / (3600*24));
  const h = Math.floor((seconds % (3600*24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d}d ${h}h ${m}m ${s}s`;
}

module.exports = {
  OWNER_ID,
  GROUP_ID,
  isAuthorized,
  privat,
  getWIBTime,
  getUptime,
  formatBytes,
  getJakartaTimeParts,
  formatTime
};

