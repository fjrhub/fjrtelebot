const { Groq } = require("groq-sdk");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const { getUserModel } = require("@/utils/userModelSelection");
dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const dbPath = path.resolve(__dirname, "../database.json");
let conversations = {};

function loadConversations() {
  if (fs.existsSync(dbPath)) {
    try {
      const raw = fs.readFileSync(dbPath, "utf-8");
      conversations = JSON.parse(raw);
    } catch (err) {
      console.error("Failed to read database.json:", err.message);
      conversations = {};
    }
  }
}

function saveConversations() {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(conversations, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save database.json:", err.message);
  }
}

loadConversations();

async function sendMessageToGroq(userId, userMessage) {
  const id = userId.toString();

  if (!conversations[id]) {
    conversations[id] = [];
  }

  conversations[id].push({
    role: 'user',
    content: userMessage
  });

  const selectedModel = getUserModel(id) || 'compound-beta-mini'; // default

  const chatCompletion = await groq.chat.completions.create({
    messages: conversations[id],
    model: selectedModel,
    temperature: 1,
    max_completion_tokens: 1024,
    top_p: 1,
    stream: false
  });

  const response = chatCompletion.choices[0]?.message?.content || 'No answer.';

  conversations[id].push({
    role: 'assistant',
    content: response
  });

  saveConversations();

  return response;
}


function getChatHistory(userId) {
  return conversations[userId.toString()] || [];
}

function resetChat(userId) {
  conversations[userId.toString()] = [];
  saveConversations();
}

module.exports = {
  sendMessageToGroq,
  getChatHistory,
  resetChat,
};
