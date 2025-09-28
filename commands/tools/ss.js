const axios = require("axios");
const { isAuthorized } = require("@/utils/helper");

module.exports = {
  name: "ss",
  description: "Ambil screenshot desktop dan mobile dari sebuah website",
  async execute(bot, msg) {
    const chatId = msg.chat.id;

    if (!isAuthorized(chatId)) return;

    const inputText = msg.text.trim(); // contoh: "/ss https://example.com"
    const args = inputText.split(" ").slice(1);
    const urlTarget = args.join(" ").trim();

    if (!urlTarget || !urlTarget.startsWith("http")) {
      return bot.sendMessage(chatId, "Masukkan URL valid setelah perintah, contoh:\n`/ss https://example.com`", {
        parse_mode: "Markdown",
      });
    }

    const endpoint = `${process.env.flowfalcon}/tools/ssweb?url=${encodeURIComponent(urlTarget)}`;

    try {
      const res = await axios.get(endpoint);
      const data = res.data;

      if (!data.status || !data.result || !data.result.pc || !data.result.mobile) {
        return bot.sendMessage(chatId, "Gagal mengambil screenshot. Respons API tidak lengkap.");
      }

      await bot.sendMediaGroup(chatId, [
        {
          type: "photo",
          media: data.result.pc,
          caption: `🖥️ Tampilan Desktop dari:\n${urlTarget}`,
        },
        {
          type: "photo",
          media: data.result.mobile,
          caption: `📱 Tampilan Mobile dari:\n${urlTarget}`,
        },
      ]);
    } catch (error) {
      console.error(error);
      bot.sendMessage(chatId, "Terjadi kesalahan saat mengambil screenshot.\nPeriksa koneksi atau URL.");
    }
  },
};
