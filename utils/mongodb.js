const { MongoClient } = require("mongodb");
require("dotenv").config();

const uri = process.env.MONGO_URI;
const dbName = "fjrtelebot";
const client = new MongoClient(uri);

// ✅ Helper koneksi
async function connectCollection(collectionName) {
  if (!client.topology?.isConnected()) {
    await client.connect();
    console.log("✅ Connected to MongoDB");
  }
  const db = client.db(dbName);
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
  const result = await collection.updateOne(
    { id },
    { $set: { status } }
  );
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

module.exports = {
  insertAutoStatus,
  updateAutoStatus,
  getAllAutoStatus,
  getAutoStatusById,
  deleteAutoStatus,
  insertUser, // contoh tambahan
};
