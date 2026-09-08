import { getSupabase } from '../lib/supabase';

async function main() {
  const supabase = getSupabase();
  const { data: marketplaces, error } = await supabase.from('marketplaces').select('*');
  if (error) throw error;
  console.log('Marketplaces in DB:');
  for (const m of marketplaces || []) {
    console.log(`- [${m.slug}] ${m.name} (id: ${m.id})`);
  }
}

main().catch(console.error);
