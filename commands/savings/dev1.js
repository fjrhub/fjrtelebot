// commands/savings/dev1.js
const { MongoClient } = require("mongodb");

const uri = process.env.MONGO_URI;
const dbName = "fjrtelebot";

module.exports = {
  name: "dev1",
  description: "Tampilkan daftar transaksi dan saldo terakhir",

  async execute(ctx) {
    const client = new MongoClient(uri);

    try {
      await client.connect();
      const db = client.db(dbName);
      const collection = db.collection("transactions");

      // Ambil semua transaksi (maksimal 10 terakhir)
      const transactions = await collection
        .find({})
        .sort({ created: -1 })
        .limit(10)
        .toArray();

      if (transactions.length === 0) {
        return ctx.reply("📭 Belum ada transaksi yang tersimpan.");
      }

      // Ambil saldo terakhir
      const lastBalance = transactions[0].balance;

      // Format daftar transaksi
      let message = "📋 *Daftar Transaksi Terbaru:*\n\n";
      transactions.reverse().forEach((t, i) => {
        const created = new Date(t.created).toLocaleString("id-ID", { hour12: false });
        message += `#${i + 1}\n💰 ${t.amount} | ${t.description}\n🏦 ${t.account} | ${t.type}\n📅 ${created}\n📊 Saldo: ${t.balance}\n\n`;
      });

      message += `----------------------\n💵 *Saldo Terakhir:* ${lastBalance}`;

      await ctx.reply(message, { parse_mode: "Markdown" });
    } catch (error) {
      console.error("❌ Gagal menampilkan transaksi:", error);
      return ctx.reply("Terjadi kesalahan saat mengambil data transaksi.");
    } finally {
      await client.close();
    }
  },
};
