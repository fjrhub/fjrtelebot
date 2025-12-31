const { MongoClient } = require("mongodb");

const uri = process.env.MONGO_URI;
const dbName = "fjrtelebot";

module.exports = {
  name: "dev",
  description: "Tambahkan transaksi manual ke database dengan balance otomatis",

  async execute(ctx) {
    const text = ctx.message?.text?.split(" ").slice(1).join(" ");
    if (!text) {
      return ctx.reply(
        "⚠️ Format salah!\nGunakan:\n/dev <amount> <description> <account> [category] [payment] [note]\n\nContoh:\n/dev -10000 kopi dompet food cash 'ngopi pagi'"
      );
    }

    const parts = text.split(" ");
    if (parts.length < 3) {
      return ctx.reply(
        "❗ Format kurang lengkap!\nContoh:\n/dev -10000 kopi dompet food cash 'ngopi pagi'"
      );
    }

    const [amountRaw, description, account, category = "general", payment = "cash", ...noteParts] = parts;
    let note = noteParts.join(" ") || "";

    // 🔧 Hapus tanda kutip di awal/akhir note
    note = note.replace(/^['"]|['"]$/g, "");

    const amount = parseFloat(amountRaw);
    if (isNaN(amount)) {
      return ctx.reply("❌ Amount harus berupa angka!");
    }

    // 💡 Tentukan type otomatis
    const type = amount < 0 ? "expense" : "income";

    const client = new MongoClient(uri);

    try {
      await client.connect();
      const db = client.db(dbName);
      const collection = db.collection("transactions");

      // Ambil transaksi terakhir untuk menghitung balance
      const lastTransaction = await collection.find().sort({ created: -1 }).limit(1).toArray();
      const lastBalance = lastTransaction.length > 0 ? lastTransaction[0].balance : 0;

      // Hitung saldo baru
      const newBalance = lastBalance + amount;

      const transaction = {
        amount,
        description,
        account,
        created: new Date(),
        updated: new Date(),
        type,
        category,
        balance: newBalance,
        payment,
        note,
      };

      await collection.insertOne(transaction);

      await ctx.reply(
        `✅ Transaksi tersimpan!\n\n💰 Jumlah: ${amount}\n📄 Deskripsi: ${description}\n🏦 Akun: ${account}\n📂 Jenis: ${type}\n🏷 Kategori: ${category}\n💳 Pembayaran: ${payment}\n🗒 Catatan: ${note}\n\n📊 Saldo Sekarang: ${newBalance}`
      );
    } catch (error) {
      console.error("❌ Gagal menyimpan transaksi:", error);
      return ctx.reply("Terjadi kesalahan saat menyimpan transaksi.");
    } finally {
      await client.close();
    }
  },
};
