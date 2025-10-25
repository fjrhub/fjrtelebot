const { MongoClient } = require("mongodb");
require("dotenv").config();

const uri = process.env.MONGO_URI;
const dbName = "fjrtelebot";
const client = new MongoClient(uri);

let isConnected = false;

// ✅ Helper koneksi stabil
async function connectCollection(collectionName) {
  console.log(
    `🧩 [connectCollection] Meminta koneksi ke koleksi "${collectionName}"`
  );
  if (!client.topology?.isConnected()) {
    console.log(
      "🔌 [connectCollection] Client belum terhubung. Menghubungkan ke MongoDB..."
    );
    await client.connect();
    console.log("✅ [connectCollection] Terhubung ke MongoDB");
  } else {
    console.log("🟢 [connectCollection] Sudah terhubung ke MongoDB");
  }

  const db = client.db(dbName);
  console.log(`📂 [connectCollection] Mengambil database "${dbName}"`);
  return db.collection(collectionName);
}

/* =========================================================
   AUTO STATUS COLLECTION (default collection kamu sekarang)
   ========================================================= */

// 🔹 Insert data baru
async function insertAutoStatus(data) {
  const collection = await connectCollection("auto_status");
  const result = await collection.insertOne(data);
  console.log("✅ Auto status inserted:", result.insertedId);
  return result;
}

// 🔹 Update status berdasarkan id
async function updateAutoStatus(id, status) {
  const collection = await connectCollection("auto_status");
  const result = await collection.updateOne({ id }, { $set: { status } });
  console.log("✏️ Auto status updated:", result.modifiedCount);
  return result;
}

// 🔹 Ambil semua data auto_status
async function getAllAutoStatus() {
  const collection = await connectCollection("auto_status");
  return await collection.find().toArray();
}

// 🔹 Ambil status berdasarkan id
async function getAutoStatusById(id) {
  const collection = await connectCollection("auto_status");
  return await collection.findOne({ id });
}

// 🔹 Hapus data auto_status
async function deleteAutoStatus(id) {
  const collection = await connectCollection("auto_status");
  const result = await collection.deleteOne({ id });
  console.log("🗑️ Auto status deleted:", result.deletedCount);
  return result;
}

/* =========================================================
   TEMPLATE UNTUK KOLEKSI LAIN (misal users, logs, dll)
   ========================================================= */

// contoh tambahan (kamu bisa tambahkan nanti)
async function insertUser(user) {
  const collection = await connectCollection("users");
  const result = await collection.insertOne(user);
  console.log("👤 User inserted:", result.insertedId);
  return result;
}

async function isAutoEnabled(chatId) {
  console.log(
    `🔍 [isAutoEnabled] Mengecek status auto untuk chatId: ${chatId}`
  );

  try {
    const collection = await connectCollection("auto_status");

    // 🔎 Cari berdasarkan id number
    const result = await collection.findOne({ id: chatId });

    if (result) {
      console.log(`📄 [isAutoEnabled] Ditemukan data:`, result);
    } else {
      console.log(
        `⚠️ [isAutoEnabled] Tidak ada data ditemukan untuk chatId ${numericId}`
      );
    }

    // ✅ Gunakan field "status"
    const enabled = result?.status === true;

    console.log(`💡 [isAutoEnabled] Status auto: ${enabled}`);
    return enabled;
  } catch (err) {
    console.error("❌ [isAutoEnabled] Error saat mengecek status auto:", err);
    return false;
  }
}

module.exports = {
  insertAutoStatus,
  updateAutoStatus,
  getAllAutoStatus,
  getAutoStatusById,
  deleteAutoStatus,
  isAutoEnabled,
  insertUser, // contoh tambahan
};
