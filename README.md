# fjrtelebot

A Node.js-based Telegram bot with multifunctional features including AI chat, media downloader, balance management, auto-reply, and various utilities.

## 🚀 Main Features

- 🤖 **AI Chat** — AI-powered responses (Groq).
- ⬇️ **Downloader** — Download media from multiple sources.
- 🕹️ **Entertainment** — Fun commands like `/waifu`.
- 💰 **Savings** — Add, view, and edit user balance.
- 🛠️ **Tools** — Utilities like ping, prayer times, screenshots, etc.

## 📁 Directory Structure

```
fjrtelebot/
├── commands/
│   ├── ai-chat/
│   ├── downloader/
│   ├── entertainment/
│   ├── savings/
│   └── tools/
├── utils/
│   ├── groq.js
│   ├── helper.js
│   ├── supabase.js
│   └── modelSelect.js
├── .env.example
├── handler.js
├── index.js
├── package.json
└── autopdate.sh
```

## ⚙️ Installation

### 1. Clone the Repository
```bash
git clone https://github.com/fajrulcore/fjrtelebot.git
cd fjrtelebot
```

### 2. Install Dependencies
```bash
pnpm install
# or: npm install / yarn install
```

### 3. Configure Environment Variables
Create a `.env` file based on the provided `.env.example` and fill in the required information such as bot token, API keys, and database configuration.  
**Do not share your `.env` file publicly.**

```bash
cp .env.example .env
nano .env
```

### 4. Start the Bot
```bash
pnpm start
# or: node index.js
```

## 💡 Bot Command Examples

| Command           | Description                         |
|-------------------|-------------------------------------|
| `/ai <prompt>`    | Ask anything to AI                  |
| `/auto_on`        | Enable auto-reply mode              |
| `/auto_off`       | Disable auto-reply mode             |
| `/waifu`          | Send a random waifu image           |
| `/sholat`         | Show prayer times                   |
| `/balance`        | Display user balance                |
| `/addbalance`     | Add balance to a user               |

## ✅ Main Dependencies

- `node-telegram-bot-api`
- `axios`
- `dotenv`
- `groq-sdk`
- `@supabase/supabase-js`
- `module-alias`

## 🤝 Contributing

Pull requests are welcome!  
Please maintain the modular folder structure and follow standard formatting.
