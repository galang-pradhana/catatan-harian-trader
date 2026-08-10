const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '/media/galangpradhana/DATA/galang/AI projek/Aplikasi/catatan-harian-trader/.env' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
async function main() {
  const { data, error } = await supabase.from('compounding_plans').select('id, name, is_manual_modal, mt5_connection_id, initial_modal').eq('id', '7e0a86c1-8a6b-41fd-ac3f-3982fd31758f').single();
  console.log("PLAN DATA:", data);
}
main();
