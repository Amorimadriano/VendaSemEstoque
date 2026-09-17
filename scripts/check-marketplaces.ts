import { getSupabase } from '../lib/supabase';

async function main() {
  const supabase = getSupabase();
  const { data: marketplaces, error } = await supabase.from('marketplaces').select('*');
  if (error) throw error;
  console.log('=== MARKETPLACES & PRODUTOS ATIVOS NO BANCO ===');
  for (const m of marketplaces || []) {
    const { count } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('marketplace_id', m.id)
      .eq('status', 'ACTIVE');
    console.log(`- [${m.slug}] ${m.name} -> ${count || 0} produtos ativos`);
  }
}

main().catch(console.error);
