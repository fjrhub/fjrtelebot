# fjrtelebot

Bot Telegram berbasis Node.js dengan fitur multi-fungsi: AI Chat, downloader, pengelolaan saldo, auto-reply, serta berbagai utilitas.

## 🚀 Fitur Utama

- 🤖 **AI Chat** — Respon otomatis berbasis AI (OpenAI atau Groq).
- ⬇️ **Downloader** — Unduh media dari berbagai sumber.
- 🕹️ **Entertainment** — Perintah hiburan seperti waifu.
- 💰 **Savings** — Tambah, lihat, dan edit saldo pengguna.
- 🔍 **Search** — Fungsi pencarian seperti DuckDuckGo.
- 🛠️ **Tools** — Perintah ping, jadwal sholat, screenshot, dsb.

## 📁 Struktur Direktori

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

## ⚙️ Instalasi

### 1. Clone Repo
```bash
git clone https://github.com/fajrulcore/fjrtelebot.git
cd fjrtelebot
```

### 2. Install Dependensi
```bash
pnpm install
# atau: npm install / yarn install
```

### 3. Salin dan edit `.env`
```bash
cp .env.example .env
nano .env
```

### 4. Jalankan Bot
```bash
pnpm start
# atau: node index.js
```

## 🧩 Konfigurasi `.env`

Isi variabel di `.env` sesuai token dan endpoint API kamu.

Contoh:
```
BOT_TOKEN=xxxxxxxx
GROQ_API_KEY=xxxxxxxx
SUPABASE_URL=...
SUPABASE_KEY=...
```

## 💡 Contoh Perintah Bot

| Perintah         | Fungsi                              |
|------------------|-------------------------------------|
| `/ai <prompt>`   | AI Chat                            |
| `/auto_on`        | Mengaktifkan auto-reply            |
| `/waifu`          | Mengirim gambar waifu random       |
| `/sholat`         | Menampilkan jadwal sholat          |
| `/balance`        | Menampilkan saldo pengguna         |
| `/addbalance`     | Menambah saldo pengguna            |
| `/duck <query>`   | Mencari informasi via DuckDuckGo   |

## ✅ Dependensi Utama

- `node-telegram-bot-api`
- `axios`
- `file-type`
- `dotenv`
- `groq`
- `supabase`

## 🤝 Kontribusi

Pull request sangat diterima!  
Pastikan struktur folder tetap modular dan gunakan format standar.