const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function insertBalance(amount, information, wallet) {
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

module.exports = {
  supabase,
  insertBalance,
};
