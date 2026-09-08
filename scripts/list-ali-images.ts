import { getSupabase } from '../lib/supabase';

async function listAliImages() {
  const supabase = getSupabase();
  const { data: products } = await supabase.from('products').select('name, image_url, external_product_id, marketplace:marketplaces(slug)').eq('status', 'ACTIVE');

  for (const p of products || []) {
    if ((p as any).marketplace?.slug === 'aliexpress') {
      console.log(`[${p.external_product_id}] ${p.name.slice(0, 35)} -> ${p.image_url}`);
    }
  }
}

listAliImages();
