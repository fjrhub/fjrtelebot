const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function insertBalance(amount, information, wallet) {
  wallet = wallet.toUpperCase(); // Make sure capitalization

  const { data: existingBalance, error: selectError } = await supabase
    .from("balance")
    .select("amount")
    .eq("wallet", wallet)
    .single();

  if (selectError) return { error: selectError };

  const { error: transactionError } = await supabase
    .from("transaction")
    .insert([{ amount, information, wallet }]);

  if (transactionError) return { error: transactionError };

  const { error: updateError } = await supabase
    .from("balance")
    .update({ amount: existingBalance.amount + amount })
    .eq("wallet", wallet);

  return { error: updateError };
}

// Get all balance data ordered by ID (ascending)
async function getAllBalances() {
  return await supabase
    .from("balance")
    .select("*")
    .gte("id", 1)
    .lte("id", 10)
    .order("id", { ascending: true });
}

// Take one balance data (first)
async function getSingleBalance() {
  return await supabase
    .from("balance")
    .select("*")
    .eq("wallet", "DOMPET")
    .single();
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
    .from("transaction")
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
    .from("transaction")
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
    .from("transaction")
    .update({
      amount: newAmount,
      information: newInfo,
      date: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateTxError) {
    return { error: `Failed to update transaction: ${updateTxError.message}` };
  }

  // Get current balance
  const { data: currentBalance, error: balanceErr } = await supabase
    .from("balance")
    .select("amount")
    .eq("wallet", wallet)
    .single();

  if (balanceErr || !currentBalance) {
    return { error: `Failed to fetch balance: ${balanceErr.message}` };
  }

  const newBalance = currentBalance.amount + diff;

  // Update the balance
  const { error: updatebalanceErr } = await supabase
    .from("balance")
    .update({ amount: newBalance })
    .eq("wallet", wallet);

  if (updatebalanceErr) {
    return { error: `Failed to update balance: ${updatebalanceErr.message}` };
  }

  return {
    success: true,
    oldAmount,
    newAmount,
    newBalance,
    wallet,
    newInfo,
  };
}

async function preloadAutoStatus() {
  const { data, error } = await supabase
    .from("auto_status")
    .select("id, status");
  if (!error && data) {
    for (const user of data) {
      autoStatusCache.set(user.id, user.status === 1);
    }
  }
}

const autoStatusCache = new Map();
const inFlightRequests = new Map(); // 🚦 track request that is currently running
const CACHE_TTL1 = 3 * 60 * 60 * 1000; // 3 hours

// ✅ Check if auto is enabled for a user
async function isAutoEnabled(userId) {
  const cached = autoStatusCache.get(userId);

  if (cached) {
    const { value, timestamp } = cached;
    const isExpired = Date.now() - timestamp > CACHE_TTL1;

    if (!isExpired) {
      console.log(`[CACHE HIT] Auto status for user ${userId}: ${value}`);
      return value;
    }

    console.log(
      `[CACHE EXPIRED] Auto status for user ${userId}. Fetching from Supabase...`
    );
    autoStatusCache.delete(userId);
  }

  // 🚦 Check if there is already a query for this userId
  if (inFlightRequests.has(userId)) {
    console.log(`[WAIT] Request already in flight for user ${userId}`);
    return inFlightRequests.get(userId);
  }

  // 🔍 New query to Supabase
  console.log(
    `[DB QUERY] Fetching auto status for user ${userId} from Supabase...`
  );
  const promise = (async () => {
    const { data, error } = await supabase
      .from("auto_status")
      .select("status")
      .eq("id", userId)
      .single();

    let isActive;
    if (!error && data) {
      isActive = Number(data.status) === 1;
      console.log(`[DB RESULT] Auto status for user ${userId}: ${isActive}`);
    } else {
      console.log(
        `[DB INSERT] No record found for user ${userId}, setting default status = true`
      );
      await setAutoStatus(userId, true);
      isActive = true;
    }

    autoStatusCache.set(userId, { value: isActive, timestamp: Date.now() });
    return isActive;
  })();

  // save the promise temporarily → so that other requests wait for this result
  inFlightRequests.set(userId, promise);

  try {
    const result = await promise;
    return result;
  } finally {
    inFlightRequests.delete(userId); // delete lock after finished
  }
}

// ✅ Update status in Supabase and cache
async function setAutoStatus(userId, status) {
  console.log(
    `[DB UPSERT] Updating auto status for user ${userId} → ${status}`
  );
  await supabase.from("auto_status").upsert({
    id: userId,
    status: status ? 1 : 0,
  });

  console.log(`[CACHE UPDATE] Auto status for user ${userId} set to ${status}`);
  autoStatusCache.set(userId, { value: !!status, timestamp: Date.now() });
}

module.exports = {
  supabase,
  insertBalance,
  getAllBalances,
  getSingleBalance,
  getTransactions,
  updateTransactionAndBalance,
  preloadAutoStatus,
  isAutoEnabled,
  setAutoStatus,
};
