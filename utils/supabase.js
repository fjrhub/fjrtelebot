const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function insertBalance(amount, information, wallet) {
  wallet = wallet.toUpperCase(); // Make sure capitalization

  const { data: existingSaldo, error: selectError } = await supabase
    .from("saldo")
    .select("amount")
    .eq("wallet", wallet)
    .single();

  if (selectError) return { error: selectError };

  const { error: transaksiError } = await supabase
    .from("transaksi")
    .insert([{ amount, information, wallet }]);

  if (transaksiError) return { error: transaksiError };

  const { error: updateError } = await supabase
    .from("saldo")
    .update({ amount: existingSaldo.amount + amount })
    .eq("wallet", wallet);

  return { error: updateError };
}

// Get all balance dataGet all balance data
async function getAllBalances() {
  return await supabase.from('saldo').select('*');
}

// Take one balance data (first)
async function getSingleBalance() {
  return await supabase.from('saldo').select('*').eq("wallet", "DOMPET").single();
}

const transactionsCache = new Map();
const CACHE_TTL = 1 * 60 * 1000; // 1 minute

function generateCacheKey({ wallet, month, page }) {
  return `${wallet || "ALL"}-${month || "ALL"}-P${page}`;
}

function getCacheIfValid(key) {
  const cached = transactionsCache.get(key);
  if (!cached) return null;

  // Expired cache
  transactionsCache.delete(key);
  return null;
}

async function getTransactions({ wallet, month, page = 1, limit = 15 }) {
  const cacheKey = generateCacheKey({ wallet, month, page });

  // Try taking it from the cache
  const cachedData = getCacheIfValid(cacheKey);
  if (cachedData) {
    return { data: cachedData, error: null };
  }

  // If it's not in the cache, take it from Supabase
  let query = supabase
    .from("transaksi")
    .select("*")
    .order("date", { ascending: true });

  if (wallet) {
    query = query.eq("wallet", wallet.toUpperCase());
  }

  if (month) {
    const startDate = new Date(`${month}-01T00:00:00.000Z`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    query = query
      .gte("date", startDate.toISOString())
      .lt("date", endDate.toISOString());
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error } = await query.range(from, to);

  return { data, error };
}


module.exports = {
  supabase,
  insertBalance,
  getAllBalances,
  getSingleBalance,
  getTransactions
};
