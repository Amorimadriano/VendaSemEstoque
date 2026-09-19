import { getMarketplaceIntegration } from '../integrations';
import { getSupabase } from '../lib/supabase';
import { ExternalProduct } from '../types';

function toSlug(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

function inferCategory(title: string, rawCategory?: string): { name: string; slug: string } {
  const text = `${title} ${rawCategory || ''}`.toLowerCase();

  if (/\b(smartwatch|smart watch|relogio inteligente|redmi watch|galaxy watch|apple watch|band 8|band 9|mi band)\b/.test(text)) {
    return { name: 'Smartwatches', slug: 'smartwatches' };
  }
  if (/\b(iphone|smartphone|celular|galaxy s|galaxy a|redmi note|xiaomi|motorola|poco)\b/.test(text)) {
    return { name: 'Smartphones', slug: 'smartphones' };
  }
  if (/\b(fone|headset|earphone|earbuds|caixa de som|soundbar|jbl|bluetooth|tws|airpods|headphone|som)\b/.test(text)) {
    return { name: 'Áudio & Som', slug: 'audio-som' };
  }
  if (/\b(notebook|laptop|computador|teclado|mouse|hub usb|usb-c|ssd|memoria ram|placa de video|monitor|roteador|informática|informatica)\b/.test(text)) {
    return { name: 'Informática', slug: 'informatica' };
  }
  if (/\b(carregador|cabo usb|cabo tipo c|power bank|suporte celular|pelicula|capinha|adaptador|gan)\b/.test(text)) {
    return { name: 'Acessórios Celular', slug: 'acessorios-celular' };
  }
  if (/\b(alexa|echo dot|lampada|fita led|led|tomada inteligente|sensor|tuya|sonoff|smart home|camera)\b/.test(text)) {
    return { name: 'Casa Inteligente', slug: 'casa-inteligente' };
  }
  if (/\b(air fryer|fritadeira|cafeteira|aspirador|liquidificador|batedeira|micro-ondas|eletrodomestico|eletrodoméstico)\b/.test(text)) {
    return { name: 'Eletrodomésticos', slug: 'eletrodomesticos' };
  }
  if (/\b(smart tv|televisao|televisor|tv 4k|tv 50|tv 55|tv 65|fire tv|chromecast|roku|video|vídeo)\b/.test(text)) {
    return { name: 'TV & Vídeo', slug: 'tv-video' };
  }
  if (/\b(gamer|gamepad|controle ps5|controle xbox|nintendo|switch|jogos)\b/.test(text)) {
    return { name: 'Gamer', slug: 'gamer' };
  }

  const baseName = rawCategory && !['AliExpress', 'Shopee', 'Amazon'].includes(rawCategory) ? rawCategory : 'Eletrônicos';
  return { name: baseName, slug: toSlug(baseName) };
}

async function upsertProduct(supabase: any, product: ExternalProduct, marketplaceId: string, marketplaceSlug: string) {
  const now = new Date().toISOString();
  const inferred = inferCategory(product.name, product.categoryName);

  const { data: category, error: catErr } = await supabase
    .from('categories')
    .upsert(
      {
        id: crypto.randomUUID(),
        name: inferred.name,
        slug: inferred.slug,
        created_at: now,
        updated_at: now,
      },
      { onConflict: 'slug' }
    )
    .select('id')
    .single();

  if (catErr) throw catErr;

  const productSlug = `${toSlug(product.name).slice(0, 80)}-${product.externalProductId.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`.slice(0, 190);

  const { data: existingProduct } = await supabase
    .from('products')
    .select('id')
    .eq('marketplace_id', marketplaceId)
    .eq('external_product_id', product.externalProductId)
    .maybeSingle();

  const commissionPercentage = product.commissionPercentage || 8;
  const commissionValue = Number(((product.price * commissionPercentage) / 100).toFixed(2));

  const productData = {
    id: existingProduct?.id || crypto.randomUUID(),
    name: product.name.trim(),
    description: product.description?.trim() || `${product.name}. Produto original com entrega garantida.`,
    category_id: category.id,
    marketplace_id: marketplaceId,
    brand: product.brand || null,
    image_url: product.imageUrl,
    images: JSON.stringify(product.images?.length ? product.images : [product.imageUrl]),
    price: product.price,
    old_price: product.oldPrice || null,
    discount_percentage: product.discountPercentage || null,
    rating: product.rating || 4.7,
    review_count: product.reviewCount || 100,
    sales_count: product.salesCount || 100,
    popularity_score: Math.round((product.rating || 4.7) * 10),
    trend_score: Math.round((product.rating || 4.7) * 8),
    commission_percentage: commissionPercentage,
    commission_value: commissionValue,
    external_product_id: product.externalProductId,
    original_url: product.originalUrl,
    affiliate_url: product.affiliateUrl,
    slug: productSlug,
    status: 'ACTIVE',
    is_best_seller: (product.salesCount || 0) >= 500,
    is_trending: (product.rating || 4.7) >= 4.7,
    last_synced_at: now,
    updated_at: now,
    ...(existingProduct ? {} : { created_at: now }),
  };

  const { data: savedProduct, error: prodErr } = await supabase
    .from('products')
    .upsert(productData, { onConflict: 'marketplace_id,external_product_id' })
    .select('id')
    .single();

  if (prodErr) throw prodErr;

  // Atualizar histórico de preços
  await supabase.from('price_history').insert({
    id: crypto.randomUUID(),
    product_id: savedProduct.id,
    price: product.price,
    old_price: product.oldPrice || null,
    recorded_at: now,
  });

  // Atualizar métricas
  await supabase.from('product_metrics').upsert({
    id: crypto.randomUUID(),
    product_id: savedProduct.id,
    updated_at: now,
  }, { onConflict: 'product_id' });

  return savedProduct;
}

async function syncMarketplace(slug: string, name: string) {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  console.log(`\n========================================`);
  console.log(`🔄 Sincronizando Marketplace: ${name} (${slug})`);
  console.log(`========================================`);

  const { data: existingMarketplace } = await supabase
    .from('marketplaces')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  const { data: marketplace, error: mktErr } = await supabase
    .from('marketplaces')
    .upsert(
      {
        id: existingMarketplace?.id || crypto.randomUUID(),
        name,
        slug,
        affiliate_status: 'ACTIVE',
        api_status: 'ACTIVE',
        created_at: now,
        updated_at: now,
      },
      { onConflict: 'slug' }
    )
    .select('id')
    .single();

  if (mktErr) throw mktErr;

  const integration = getMarketplaceIntegration(slug);
  const products = await integration.getProducts('', undefined, 20);

  console.log(`📦 Encontrados ${products.length} produtos para ${name}`);

  let successCount = 0;
  for (const product of products) {
    try {
      await upsertProduct(supabase, product, marketplace.id, slug);
      console.log(`  ✅ [${slug.toUpperCase()}] ${product.name.slice(0, 60)}... - R$ ${product.price}`);
      successCount += 1;
    } catch (err: any) {
      console.error(`  ❌ Erro ao salvar ${product.name}:`, err?.message || err);
    }
  }

  // Registrar log de sincronização
  await supabase.from('marketplace_sync_logs').insert({
    id: crypto.randomUUID(),
    marketplace_slug: slug,
    searched_terms: 1,
    found: products.length,
    filtered_out: 0,
    published: successCount,
    status: successCount > 0 ? 'SUCCESS' : 'FAILED',
    created_at: now,
  });

  console.log(`✨ Total sincronizado com sucesso para ${name}: ${successCount}/${products.length}`);
}

async function main() {
  console.log('🚀 INICIANDO SINCRONIZAÇÃO COMPLETA DE PRODUTOS PARA TODOS OS MARKETPLACES');
  const marketplaces = [
    { slug: 'amazon', name: 'Amazon' },
    { slug: 'aliexpress', name: 'AliExpress' },
    { slug: 'shopee', name: 'Shopee' },
  ];

  for (const mkt of marketplaces) {
    try {
      await syncMarketplace(mkt.slug, mkt.name);
    } catch (err: any) {
      console.error(`Erro geral na sincronização de ${mkt.name}:`, err?.message || err);
    }
  }

  console.log('\n🎉 SINCRONIZAÇÃO CONCLUÍDA PARA TODOS OS MARKETPLACES!');
}

main().catch(console.error);
