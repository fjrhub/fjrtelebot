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

// 🧠 Cache lokal di memory
const autoCache = new Map();
const CACHE_DURATION = 3 * 60 * 60 * 1000; // 3 jam dalam milidetik

// 🟩 Mengecek status auto dengan cache
async function isAutoEnabled(chatId) {
  console.log(
    `🔍 [isAutoEnabled] Mengecek status auto untuk chatId: ${chatId}`
  );

  // 🕒 Cek cache dulu
  const cached = autoCache.get(chatId);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_DURATION) {
    console.log(`⚡ [isAutoEnabled] Menggunakan data cache: ${cached.status}`);
    return cached.status;
  }

  try {
    const collection = await connectCollection("auto_status");
    const result = await collection.findOne({ id: chatId });

    if (result) {
      console.log(`📄 [isAutoEnabled] Ditemukan data di DB:`, result);
    } else {
      console.log(
        `⚠️ [isAutoEnabled] Tidak ada data ditemukan untuk chatId ${chatId}`
      );
    }

    const enabled = result?.status === true;

    // 🧩 Simpan ke cache
    autoCache.set(chatId, { status: enabled, timestamp: now });
    console.log(`💾 [isAutoEnabled] Menyimpan ke cache untuk 3 jam`);
    return enabled;
  } catch (err) {
    console.error("❌ [isAutoEnabled] Error saat mengecek status auto:", err);
    return false;
  }
}

// 🟦 Update status dan invalidasi cache
async function updateAutoStatus(id, status) {
  const collection = await connectCollection("auto_status");
  const result = await collection.updateOne({ id }, { $set: { status } });

  console.log("✏️ Auto status updated:", result.modifiedCount);

  // 🧹 Hapus cache biar nanti ambil ulang dari DB
  if (autoCache.has(id)) {
    autoCache.delete(id);
    console.log(`🗑️ [updateAutoStatus] Cache untuk chatId ${id} dihapus`);
  }

  return result;
}

module.exports = {
  insertAutoStatus,
  updateAutoStatus,
  getAllAutoStatus,
  getAutoStatusById,
  deleteAutoStatus,
  isAutoEnabled,
};
