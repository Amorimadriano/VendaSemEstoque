import { getSupabase } from '../lib/supabase';

async function main() {
  const supabase = getSupabase();
  const { data: logs, error } = await supabase
    .from('marketplace_sync_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) throw error;
  console.log('Últimos logs de sincronização:');
  console.log(JSON.stringify(logs, null, 2));
}

main().catch(console.error);
