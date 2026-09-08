import { getSupabase } from '../lib/supabase';

async function main() {
  const supabase = getSupabase();
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, external_product_id, status, marketplace:marketplaces(slug)');
  if (error) throw error;
  console.log('Product statuses:');
  for (const p of products || []) {
    console.log(`- [${(p as any).marketplace?.slug}] [${p.external_product_id}] status=${p.status} name=${p.name.slice(0, 30)}`);
  }
}

main().catch(console.error);
