import { getMarketplaceIntegration } from '../integrations';
import { ExternalProduct } from '../types';
import { getSupabase } from '../lib/supabase';

const SEARCHES = (process.env.PRODUCT_SEARCHES || 'eletronicos,celular,fones,notebook,smart tv,casa').split(',').map((term) => term.trim()).filter(Boolean);
const MIN_RATING = Number(process.env.PRODUCT_MIN_RATING || 4);
const MIN_REVIEWS = Number(process.env.PRODUCT_MIN_REVIEWS || 20);
const DEFAULT_COMMISSION = Number(process.env.MERCADOLIVRE_COMMISSION_PERCENTAGE || 10);
const MIN_PRICE = Number(process.env.PRODUCT_MIN_PRICE || 30);
const MAX_PRICE = Number(process.env.PRODUCT_MAX_PRICE || 5000);
const MARKETPLACES = (process.env.MARKETPLACES_TO_SYNC || 'mercadolivre,aliexpress').split(',').map((marketplace) => marketplace.trim()).filter(Boolean);

function toSlug(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

function isWorthPublishing(product: ExternalProduct) {
  return product.isAvailable && product.price >= MIN_PRICE && product.price <= MAX_PRICE;
}

function optimizeTitle(product: ExternalProduct) {
  const title = product.name.replace(/\s+/g, ' ').trim();
  return title.length <= 120 ? title : `${title.slice(0, 117).trim()}...`;
}

function optimizeDescription(product: ExternalProduct) {
  const description = product.description.replace(/\s+/g, ' ').trim();
  return description.length >= 80 ? description : `${description || product.name}. Confira preço, disponibilidade e condições diretamente no Mercado Livre.`;
}

function calculateRanking(product: ExternalProduct, commissionPercentage: number) {
  const sales = Math.min(product.salesCount || 0, 10000) / 100;
  const discount = Math.min(product.discountPercentage || 0, 70);
  const margin = Math.min(commissionPercentage, 30) * 2;
  return Math.round((sales * 0.55 + discount * 0.25 + margin * 0.2) * 100) / 100;
}

async function upsertProduct(product: ExternalProduct, marketplaceSlug: string) {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const marketplaceName = marketplaceSlug === 'aliexpress' ? 'AliExpress' : 'Mercado Livre';
  const { data: currentMarketplace } = await supabase.from('marketplaces').select('id').eq('slug', marketplaceSlug).maybeSingle();
  const { data: marketplace, error: marketplaceError } = await supabase.from('marketplaces').upsert({ id: currentMarketplace?.id || crypto.randomUUID(), name: marketplaceName, slug: marketplaceSlug, affiliate_status: 'ACTIVE', api_status: 'ACTIVE', created_at: now, updated_at: now }, { onConflict: 'slug' }).select('id').single();
  if (marketplaceError) throw marketplaceError;

  const categorySlug = toSlug(product.categoryName || 'ofertas');
  const { data: currentCategory } = await supabase.from('categories').select('id').eq('slug', categorySlug).maybeSingle();
  const { data: category, error: categoryError } = await supabase.from('categories').upsert({ id: currentCategory?.id || crypto.randomUUID(), name: product.categoryName || 'Ofertas', slug: categorySlug, created_at: now, updated_at: now }, { onConflict: 'slug' }).select('id').single();
  if (categoryError) throw categoryError;

  const affiliateUrl = await getMarketplaceIntegration(marketplaceSlug).createAffiliateLink(product.originalUrl, product.externalProductId);
  const slug = `${toSlug(product.name)}-${product.externalProductId.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`.slice(0, 190);
  const commissionPercentage = product.commissionPercentage || DEFAULT_COMMISSION;
  const ranking = calculateRanking(product, commissionPercentage);
  const optimizedTitle = optimizeTitle(product);
  const optimizedDescription = optimizeDescription(product);

  const { data: currentProduct } = await supabase.from('products').select('id').eq('external_product_id', product.externalProductId).maybeSingle();
    const productData = {
      id: currentProduct?.id || crypto.randomUUID(),
      name: optimizedTitle,
      description: optimizedDescription,
      category_id: category.id,
      marketplace_id: marketplace.id,
      brand: product.brand || null,
      image_url: product.imageUrl,
      images: JSON.stringify(product.images?.length ? product.images : [product.imageUrl]),
      price: product.price,
      old_price: product.oldPrice || null,
      discount_percentage: product.discountPercentage || null,
      rating: product.rating,
      review_count: product.reviewCount,
      sales_count: product.salesCount || 0,
      popularity_score: ranking,
      trend_score: product.salesCount && product.salesCount > 100 ? ranking : 0,
      commission_percentage: commissionPercentage,
      commission_value: product.price * commissionPercentage / 100,
      external_product_id: product.externalProductId,
      original_url: product.originalUrl,
      affiliate_url: affiliateUrl,
      last_synced_at: now,
      updated_at: now,
      ...(currentProduct ? {} : { created_at: now }),
      is_best_seller: (product.salesCount || 0) >= 1000,
      is_trending: ranking >= 35,
      status: 'ACTIVE',
    slug,
  };

  const { data: savedProduct, error: productError } = await supabase.from('products').upsert(productData, { onConflict: 'external_product_id' }).select('id').single();
  if (productError) throw productError;

  const { error: historyError } = await supabase.from('price_history').insert({ id: crypto.randomUUID(), product_id: savedProduct.id, price: product.price, old_price: product.oldPrice || null });
  if (historyError) console.warn('Could not save price history:', historyError.message);
  const { error: metricError } = await supabase.from('product_metrics').upsert({ id: crypto.randomUUID(), product_id: savedProduct.id, updated_at: now }, { onConflict: 'product_id' });
  if (metricError) console.warn('Could not initialize product metrics:', metricError.message);

  return savedProduct;
}

type MarketplaceSyncLog = {
  marketplaceSlug: string;
  searchedTerms: number;
  found: number;
  filteredOut: number;
  published: number;
  status: 'SUCCESS' | 'NO_PRODUCTS' | 'FAILED' | 'MISSING_CREDENTIALS';
  errorMessage?: string;
};

function checkMarketplaceCredentials(marketplaceSlug: string): string | null {
  if (marketplaceSlug === 'mercadolivre' && !process.env.MERCADOLIVRE_ACCESS_TOKEN && !process.env.MERCADOLIVRE_REFRESH_TOKEN) {
    return 'Mercado Livre OAuth não configurado: cadastre MERCADOLIVRE_ACCESS_TOKEN ou MERCADOLIVRE_REFRESH_TOKEN.';
  }
  if (marketplaceSlug === 'aliexpress' && (!process.env.ALIEXPRESS_APP_KEY || !process.env.ALIEXPRESS_APP_SECRET || !process.env.ALIEXPRESS_TRACKING_ID)) {
    return 'AliExpress não configurado: cadastre ALIEXPRESS_APP_KEY, ALIEXPRESS_APP_SECRET e ALIEXPRESS_TRACKING_ID.';
  }
  return null;
}

async function persistSyncLog(log: MarketplaceSyncLog) {
  const supabase = getSupabase();
  const { error } = await supabase.from('marketplace_sync_logs').insert({
    id: crypto.randomUUID(),
    marketplace_slug: log.marketplaceSlug,
    searched_terms: log.searchedTerms,
    found: log.found,
    filtered_out: log.filteredOut,
    published: log.published,
    status: log.status,
    error_message: log.errorMessage?.slice(0, 500) || null,
  });
  if (error) console.warn(`Could not persist sync log for ${log.marketplaceSlug}:`, error.message);
}

async function syncMarketplace(marketplaceSlug: string): Promise<{ log: MarketplaceSyncLog; discovered: Map<string, ExternalProduct> }> {
  const discovered = new Map<string, ExternalProduct>();
  const missingCredentials = checkMarketplaceCredentials(marketplaceSlug);
  if (missingCredentials) {
    const log: MarketplaceSyncLog = { marketplaceSlug, searchedTerms: SEARCHES.length, found: 0, filteredOut: 0, published: 0, status: 'MISSING_CREDENTIALS', errorMessage: missingCredentials };
    await persistSyncLog(log);
    return { log, discovered };
  }

  const integration = getMarketplaceIntegration(marketplaceSlug);
  let found = 0;
  let filteredOut = 0;
  const errors: string[] = [];

  for (const search of SEARCHES) {
    try {
      const products = await integration.getProducts(search, undefined, 20);
      found += products.length;
      for (const product of products) {
        if (isWorthPublishing(product)) {
          discovered.set(`${marketplaceSlug}:${product.externalProductId}`, product);
        } else {
          filteredOut += 1;
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`"${search}": ${message}`);
      console.warn(`Search failed for ${marketplaceSlug}/${search}:`, error);
    }
  }

  let published = 0;
  for (const [key, product] of discovered.entries()) {
    try {
      await upsertProduct(product, key.split(':')[0]);
      published += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`upsert "${product.name}": ${message}`);
    }
  }

  const status: MarketplaceSyncLog['status'] = errors.length >= SEARCHES.length && published === 0
    ? 'FAILED'
    : published === 0
      ? 'NO_PRODUCTS'
      : 'SUCCESS';

  const log: MarketplaceSyncLog = {
    marketplaceSlug,
    searchedTerms: SEARCHES.length,
    found,
    filteredOut,
    published,
    status,
    errorMessage: errors[0],
  };
  await persistSyncLog(log);
  return { log, discovered };
}

export async function runProductDiscovery() {
  const discovered = new Map<string, ExternalProduct>();
  const logs: MarketplaceSyncLog[] = [];

  for (const marketplaceSlug of MARKETPLACES) {
    const result = await syncMarketplace(marketplaceSlug);
    logs.push(result.log);
    for (const [key, product] of result.discovered.entries()) discovered.set(key, product);
  }

  for (const marketplaceSlug of MARKETPLACES) {
    try {
      const integration = getMarketplaceIntegration(marketplaceSlug);
      const supabase = getSupabase();
      const { data: marketplace } = await supabase.from('marketplaces').select('id').eq('slug', marketplaceSlug).maybeSingle();
      if (!marketplace) continue;
      const { data: existing, error: existingError } = await supabase.from('products').select('id,external_product_id').eq('marketplace_id', marketplace.id).eq('status', 'ACTIVE');
      if (existingError) throw existingError;
      for (const product of existing || []) {
        if (!discovered.has(`${marketplaceSlug}:${product.external_product_id}`)) {
          const available = await integration.getAvailability(product.external_product_id);
          if (!available) {
            await supabase.from('products').update({ status: 'OUT_OF_STOCK', last_synced_at: new Date().toISOString() }).eq('id', product.id);
          }
        }
      }
    } catch (error) {
      console.warn(`Could not refresh availability for ${marketplaceSlug}:`, error);
    }
  }

  const published = logs.reduce((total, log) => total + log.published, 0);
  if (published === 0) {
    throw new Error(`Nenhum produto foi publicado em ${MARKETPLACES.join(', ')}. Consulte os logs de sincronização por marketplace para o motivo detalhado.`);
  }

  return { marketplaces: MARKETPLACES, searched: SEARCHES.length, discovered: discovered.size, published, rankingUpdated: published, logs };
}

if (require.main === module) {
  runProductDiscovery()
    .then((result) => console.log(JSON.stringify(result)))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(() => undefined);
}
