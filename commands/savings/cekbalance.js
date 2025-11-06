const { MongoClient } = require("mongodb");

const uri = process.env.MONGO_URI;
const dbName = "fjrtelebot";

module.exports = {
  name: "cekbalance",
  description: "Show the latest account balance only",

  async execute(ctx) {
    const client = new MongoClient(uri);

    try {
      await client.connect();
      const db = client.db(dbName);
      const collection = db.collection("transactions");

      // Fetch only the most recent transaction
      const latestTransaction = await collection
        .find({})
        .sort({ created: -1 })
        .limit(1)
        .toArray();

      if (latestTransaction.length === 0) {
        return ctx.reply("📭 No transactions found in the database.");
      }

      const { balance, created } = latestTransaction[0];
      const formattedDate = new Date(created).toLocaleString("id-ID", { hour12: false });

      const message = `💰 *Current Balance:*\n\n` +
                      `📊 ${balance}\n` +
                      `🕒 Updated: ${formattedDate}`;

      await ctx.reply(message, { parse_mode: "Markdown" });
    } catch (error) {
      console.error("❌ Failed to fetch latest balance:", error);
      return ctx.reply("An error occurred while checking the latest balance.");
    } finally {
      await client.close();
    }
  },
};
