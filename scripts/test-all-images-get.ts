import { getSupabase } from '../lib/supabase';

async function testImagesGet() {
  const supabase = getSupabase();
  const { data: products } = await supabase.from('products').select('id, name, image_url, marketplace:marketplaces(slug)');

  console.log(`Checking ${products?.length} product images with GET...`);
  let failed = 0;
  let ok = 0;

  for (const p of products || []) {
    try {
      const res = await fetch(p.image_url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/*,*/*;q=0.8',
        }
      });
      if (res.ok) {
        ok++;
      } else {
        failed++;
        console.warn(`[FAILED ${res.status}] [${(p as any).marketplace?.slug}] ${p.name.slice(0, 30)} -> ${p.image_url}`);
      }
    } catch (err: any) {
      failed++;
      console.warn(`[ERROR] [${(p as any).marketplace?.slug}] ${p.name.slice(0, 30)} -> ${err.message}`);
    }
  }

  console.log(`\nResult GET: OK=${ok}, FAILED=${failed}`);
}

testImagesGet();
