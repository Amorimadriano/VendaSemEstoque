import { getSupabase } from '../lib/supabase';

async function main() {
  const supabase = getSupabase();
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, external_product_id, price, image_url, original_url, affiliate_url, status')
    .order('created_at', { ascending: false });

  if (error) throw error;
  console.log(`Total de produtos cadastrados: ${products.length}`);
  for (const p of products) {
    console.log(`- [${p.external_product_id}] ${p.name.slice(0, 45)}... | R$ ${p.price} | URL: ${p.original_url}`);
  }
}

main().catch(console.error);
