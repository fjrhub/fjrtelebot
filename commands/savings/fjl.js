const { privat } = require("@/utils/helper");
const { updateFJL } = require("@/utils/supabase");

module.exports = {
  name: "fjl",
  description: "Hitung transaksi FJL (saldo, cash, profit, dompet)",

  async execute(bot, msg, args) {
    const chatId = msg.chat.id;
    if (!privat(chatId)) return;

    if (args.length < 3) {
      return bot.sendMessage(
        chatId,
        "Usage: /fjl <pengeluaran_saldo> <pemasukan_cash> <informasi>"
      );
    }

    const pengeluaran = parseInt(args[0].replace(/\./g, "").replace(/,/g, ""));
    const pemasukan = parseInt(args[1].replace(/\./g, "").replace(/,/g, ""));
    const information = args.slice(2).join(" ");

    if (isNaN(pengeluaran) || isNaN(pemasukan) || !information) {
      return bot.sendMessage(
        chatId,
        "❌ Format salah.\nContoh:\n/fjl 5500 7000 Isi pulsa 5k"
      );
    }

    const { error, newFjlcash, newFjlsaldo, newProfit, newDompet } =
      await updateFJL(pengeluaran, pemasukan, information);

    if (error) {
      return bot.sendMessage(chatId, "❌ Gagal update balance. Coba lagi nanti.");
    }

    // Chat atas → ringkas (seperti nota kecil)
    const header = `✅ Transaksi berhasil:
📝 ${information}
💸 Modal: Rp${pengeluaran.toLocaleString("id-ID")}
💰 Bayar: Rp${pemasukan.toLocaleString("id-ID")}
📊 Profit: Rp${newProfit.toLocaleString("id-ID")}`;

    // Chat bawah → kondisi balance terbaru
    const detail = `\n\n📌 Update Balance:
🏦 FJLSALDO: Rp${newFjlsaldo.toLocaleString("id-ID")}
💰 FJLCASH: Rp${newFjlcash.toLocaleString("id-ID")}
📊 FJLPROFIT: Rp${newProfit.toLocaleString("id-ID")}
👛 DOMPET: Rp${newDompet.toLocaleString("id-ID")}`;

    bot.sendMessage(chatId, header + detail);
  },
};
