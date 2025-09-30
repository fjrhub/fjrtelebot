const { privat } = require("@/utils/helper");
const { updateFJL } = require("@/utils/supabase");

module.exports = {
  name: "fjl",
  description: "Hitung transaksi FJL (saldo, cash, profit, dompet)",

  async execute(ctx) {
    const chatId = ctx.chat.id;
    if (!privat(chatId)) return;

    const args = (ctx.message.text || "").trim().split(" ").slice(1);

    if (args.length < 3) {
      return ctx.reply(
        "Usage: /fjl <pengeluaran_saldo> <pemasukan_cash> <informasi>"
      );
    }

    const pengeluaran = parseInt(args[0].replace(/\./g, "").replace(/,/g, ""));
    const pemasukan = parseInt(args[1].replace(/\./g, "").replace(/,/g, ""));
    const information = args.slice(2).join(" ");

    if (isNaN(pengeluaran) || isNaN(pemasukan) || !information) {
      return ctx.reply(
        "❌ Format salah.\nContoh:\n/fjl 5500 7000 Isi pulsa 5k"
      );
    }

    const { error, newFjlcash, newFjlsaldo, newProfit, newDompet } =
      await updateFJL(pengeluaran, pemasukan, information);

    if (error) {
      return ctx.reply("❌ Gagal update balance. Coba lagi nanti.");
    }

    const header = `✅ Transaksi berhasil:
📝 ${information}
💸 Modal: Rp${pengeluaran.toLocaleString("id-ID")}
💰 Bayar: Rp${pemasukan.toLocaleString("id-ID")}
📊 Profit: Rp${newProfit.toLocaleString("id-ID")}`;

    const detail = `\n\n📌 Update Balance:
🏦 FJLSALDO: Rp${newFjlsaldo.toLocaleString("id-ID")}
💰 FJLCASH: Rp${newFjlcash.toLocaleString("id-ID")}
📊 FJLPROFIT: Rp${newProfit.toLocaleString("id-ID")}
👛 DOMPET: Rp${newDompet.toLocaleString("id-ID")}`;

    return ctx.reply(header + detail);
  },
};
