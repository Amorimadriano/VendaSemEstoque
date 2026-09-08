import { getSupabase } from '../lib/supabase';

async function main() {
  const supabase = getSupabase();
  const { data: categories, error: catErr } = await supabase
    .from('categories')
    .select('id, name, slug, products(count)');
  
  if (catErr) throw catErr;

  console.log('=== CATEGORIES ===');
  for (const c of categories || []) {
    console.log(`[${c.slug}] "${c.name}" -> count: ${c.products?.[0]?.count ?? 0}`);
  }

  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id, name, category_id, category:categories(name, slug), marketplace:marketplaces(name, slug)');
  
  if (prodErr) throw prodErr;

  console.log('\n=== PRODUCTS & THEIR CATEGORY ===');
  for (const p of products || []) {
    console.log(`- ${p.name.slice(0, 40)}... | Mkt: ${(p as any).marketplace?.name} | Cat: ${(p as any).category?.name} (${(p as any).category?.slug})`);
  }
}

main().catch(console.error);
