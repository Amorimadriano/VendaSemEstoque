import { getSupabase } from '../lib/supabase';

async function main() {
  const supabase = getSupabase();
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, external_product_id, price, image_url, status, marketplace:marketplaces(name, slug)');

  if (error) throw error;

  console.log(`=== TOTAL DE PRODUTOS NO BANCO: ${products?.length || 0} ===`);
  const withoutImage: any[] = [];
  const outOfStock: any[] = [];

  for (const p of products || []) {
    const hasValidImage = p.image_url && p.image_url.startsWith('http') && !p.image_url.includes('undefined');
    if (!hasValidImage) withoutImage.push(p);
    if (p.status !== 'ACTIVE') outOfStock.push(p);

    console.log(`[${(p as any).marketplace?.slug}] [${p.status}] Img: ${hasValidImage ? 'OK' : 'MISSING'} | R$ ${p.price} | ${p.name.slice(0, 50)}`);
  }

  console.log(`\nResumo:`);
  console.log(`- Sem imagem válida: ${withoutImage.length}`);
  console.log(`- Fora de estoque / Inativos: ${outOfStock.length}`);
}

main().catch(console.error);
