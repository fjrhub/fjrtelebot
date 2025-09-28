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

// Get all balance data ordered by ID (ascending)
async function getAllBalances() {
  return await supabase.from('saldo').select('*').order('id', { ascending: true });
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

async function updateTransactionAndBalance(id, newAmount, newInfo) {
  // Get old transaction
  const { data: oldTx, error: getErr } = await supabase
    .from("transaksi")
    .select("*")
    .eq("id", id)
    .single();

  if (getErr || !oldTx) {
    return { error: `Transaction ID ${id} not found.` };
  }

  const oldAmount = oldTx.amount;
  const wallet = oldTx.wallet.toUpperCase();
  const diff = newAmount - oldAmount;

  // Update the transaction
  const { error: updateTxError } = await supabase
    .from("transaksi")
    .update({
      amount: newAmount,
      information: newInfo,
      date: new Date().toISOString()
    })
    .eq("id", id);

  if (updateTxError) {
    return { error: `Failed to update transaction: ${updateTxError.message}` };
  }

  // Get current balance
  const { data: currentBalance, error: saldoErr } = await supabase
    .from("saldo")
    .select("amount")
    .eq("wallet", wallet)
    .single();

  if (saldoErr || !currentBalance) {
    return { error: `Failed to fetch balance: ${saldoErr.message}` };
  }

  const newBalance = currentBalance.amount + diff;

  // Update the balance
  const { error: updateSaldoErr } = await supabase
    .from("saldo")
    .update({ amount: newBalance })
    .eq("wallet", wallet);

  if (updateSaldoErr) {
    return { error: `Failed to update balance: ${updateSaldoErr.message}` };
  }

  return {
    success: true,
    oldAmount,
    newAmount,
    newBalance,
    wallet,
    newInfo
  };
}

async function testUpdateModel() {
  const { error } = await supabase
    .from('saldo')
    .update({ model: 'groqModel' })
    .eq('id', 1); // Update row where id = 1

  if (error) {
    console.error('Failed to update model:', error.message);
  } else {
    console.log('Successfully updated model to "groqModel" for id = 1');
  }
}

testUpdateModel();




module.exports = {
  supabase,
  insertBalance,
  getAllBalances,
  getSingleBalance,
  getTransactions,
  updateTransactionAndBalance
};
