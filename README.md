# fjrtelebot

A Node.js-based Telegram bot with multifunctional features including AI chat, media downloader, balance management, auto-reply, and various utilities.

## 🚀 Main Features

- 🤖 **AI Chat** — AI-powered responses (Groq).
- ⬇️ **Downloader** — Download media from multiple sources.
- 🕹️ **Entertainment** — Fun commands like `/waifu`.
- 💰 **Savings** — Add, view, and edit user balance.
- 🔍 **Search** — Search features like DuckDuckGo queries.
- 🛠️ **Tools** — Utilities like ping, prayer times, screenshots, etc.

## 📁 Directory Structure

```
fjrtelebot/
├── commands/
│   ├── ai-chat/
│   ├── downloader/
│   ├── entertainment/
│   ├── savings/
│   ├── search/
│   └── tools/
├── utils/
│   ├── groq.js
│   ├── helper.js
│   ├── supabase.js
│   └── userModelSelection.js
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

### 3. Copy and Configure `.env`
```bash
cp .env.example .env
nano .env
```

### 4. Start the Bot
```bash
pnpm start
# or: node index.js
```

## 🧩 `.env` Configuration

Fill in the variables in your `.env` file with your bot token and API keys.

Example:
```
TOKEN=123456789:ABCdefGhIjKlMnOpQrStUvWxYz
PRIVATE=123456789
GC=-987654321,123456789
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-supabase-service-role-key
WAIFU_API_URL=
GROQ_API_KEY=
FAST=
diioffc=
flowfalcon=
archive=
vreden=
vapis=
myquran=
```

## 💡 Bot Command Examples

| Command           | Function                            |
|------------------|-------------------------------------|
| `/ai <prompt>`   | Ask anything to AI                  |
| `/auto_on`        | Enable auto-reply mode              |
| `/auto_off`        | Disable auto-reply mode              |
| `/waifu`          | Send a random waifu image           |
| `/sholat`         | Show prayer times                   |
| `/balance`        | Display user balance                |
| `/addbalance`     | Add balance to a user               |
| `/duck <query>`   | Search info using DuckDuckGo        |

## ✅ Main Dependencies

- `node-telegram-bot-api`
- `axios`
- `dotenv`
- `groq-sdk`
- `@supabase/supabase-js`
- `module-alias`

## 🤝 Contributing

Pull requests are welcome!  
Please keep the folder structure modular and follow standard formatting.
