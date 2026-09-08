import { getMarketplaceIntegration } from '../integrations';
import { ExternalProduct } from '../types';
import { getSupabase } from '../lib/supabase';

const SEARCHES = (process.env.PRODUCT_SEARCHES || 'eletronicos,celular,fones,notebook,smart tv,casa').split(',').map((term) => term.trim()).filter(Boolean);
const MIN_RATING = Number(process.env.PRODUCT_MIN_RATING || 4);
const MIN_REVIEWS = Number(process.env.PRODUCT_MIN_REVIEWS || 20);
const DEFAULT_COMMISSION = Number(process.env.MERCADOLIVRE_COMMISSION_PERCENTAGE || 10);
const MIN_PRICE = Number(process.env.PRODUCT_MIN_PRICE || 20);
const MAX_PRICE = Number(process.env.PRODUCT_MAX_PRICE || 15000);
const MARKETPLACES = (process.env.MARKETPLACES_TO_SYNC || 'mercadolivre,aliexpress').split(',').map((marketplace) => marketplace.trim()).filter(Boolean);

function toSlug(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

export function inferCategory(title: string, rawCategory?: string): { name: string; slug: string } {
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

  const baseName = rawCategory && rawCategory !== 'Mercado Livre' && rawCategory !== 'AliExpress' ? rawCategory : 'Eletrônicos';
  return { name: baseName, slug: toSlug(baseName) };
}

type ValidationResult = {
  isValid: boolean;
  reason?: string;
};

export function validateCandidateProduct(product: ExternalProduct, marketplaceSlug: string): ValidationResult {
  if (!product) return { isValid: false, reason: 'Produto nulo ou indefinido' };

  // 1. Validação de ID original
  if (!product.externalProductId || typeof product.externalProductId !== 'string' || product.externalProductId.trim().length < 3) {
    return { isValid: false, reason: 'ID de produto original inválido ou ausente' };
  }

  // 2. Validação de Título/Nome
  if (!product.name || typeof product.name !== 'string' || product.name.trim().length < 5) {
    return { isValid: false, reason: 'Título do produto inválido (mínimo 5 caracteres)' };
  }

  // 3. Validação de Preço
  if (typeof product.price !== 'number' || Number.isNaN(product.price) || product.price <= 0) {
    return { isValid: false, reason: 'Preço deve ser maior que zero' };
  }
  if (product.price < MIN_PRICE || product.price > MAX_PRICE) {
    return { isValid: false, reason: `Preço fora da faixa permitida (R$ ${MIN_PRICE} a R$ ${MAX_PRICE})` };
  }

  // 4. Validação de Imagem
  if (!product.imageUrl || typeof product.imageUrl !== 'string' || !product.imageUrl.startsWith('http')) {
    return { isValid: false, reason: 'URL da imagem principal inválida ou ausente' };
  }

  // 5. Validação de URL Original (deve ser anúncio/produto real, não página de busca ou categoria)
  if (!product.originalUrl || typeof product.originalUrl !== 'string' || !product.originalUrl.startsWith('http')) {
    return { isValid: false, reason: 'URL original inválida ou ausente' };
  }

  if (marketplaceSlug === 'mercadolivre') {
    const mlUrl = product.originalUrl.toLowerCase();
    if (mlUrl.includes('lista.mercadolivre.com.br') || mlUrl.includes('/search') || mlUrl.includes('/busca')) {
      return { isValid: false, reason: 'URL do Mercado Livre é página de busca, não anúncio de produto direto' };
    }
  }

  if (marketplaceSlug === 'aliexpress') {
    const aliUrl = product.originalUrl.toLowerCase();
    if (aliUrl.includes('/wholesale') || aliUrl.includes('/category') || aliUrl.includes('/search')) {
      return { isValid: false, reason: 'URL do AliExpress é categoria/busca, não anúncio de item direto' };
    }
  }

  // 6. Validação de Disponibilidade
  if (!product.isAvailable) {
    return { isValid: false, reason: 'Produto marcado como indisponível ou esgotado' };
  }

  return { isValid: true };
}

function optimizeTitle(product: ExternalProduct) {
  const title = product.name.replace(/\s+/g, ' ').trim();
  return title.length <= 120 ? title : `${title.slice(0, 117).trim()}...`;
}

function optimizeDescription(product: ExternalProduct, marketplaceName = 'site parceiro') {
  const description = product.description.replace(/\s+/g, ' ').trim();
  return description.length >= 80 ? description : `${description || product.name}. Confira preço, disponibilidade e condições diretamente no ${marketplaceName}.`;
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

  const inferred = inferCategory(product.name, product.categoryName);
  const { data: currentCategory } = await supabase.from('categories').select('id').eq('slug', inferred.slug).maybeSingle();
  const { data: category, error: categoryError } = await supabase.from('categories').upsert({
    id: currentCategory?.id || crypto.randomUUID(),
    name: inferred.name,
    slug: inferred.slug,
    created_at: now,
    updated_at: now,
  }, { onConflict: 'slug' }).select('id').single();
  if (categoryError) throw categoryError;

  const affiliateUrl = await getMarketplaceIntegration(marketplaceSlug).createAffiliateLink(product.originalUrl, product.externalProductId);
  const slug = `${toSlug(product.name)}-${product.externalProductId.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`.slice(0, 190);
  const commissionPercentage = product.commissionPercentage || DEFAULT_COMMISSION;
  const ranking = calculateRanking(product, commissionPercentage);
  const optimizedTitle = optimizeTitle(product);
  const optimizedDescription = optimizeDescription(product, marketplaceName);

  const { data: currentProduct } = await supabase
    .from('products')
    .select('id')
    .eq('marketplace_id', marketplace.id)
    .eq('external_product_id', product.externalProductId)
    .maybeSingle();

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

  const { data: savedProduct, error: productError } = await supabase
    .from('products')
    .upsert(productData, { onConflict: 'marketplace_id,external_product_id' })
    .select('id')
    .single();
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
  const rawCandidates: ExternalProduct[] = [];
  const errors: string[] = [];

  // ETAPA 1: Busca de candidatos nos termos configurados + catálogo geral
  const searchTerms = ['', ...SEARCHES];
  for (const search of searchTerms) {
    try {
      const products = await integration.getProducts(search || undefined, undefined, 20);
      for (const product of products) {
        if (product && product.externalProductId) {
          rawCandidates.push(product);
        }
      }
    } catch (error) {
      if (search) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`"${search}": ${message}`);
        console.warn(`Search failed for ${marketplaceSlug}/${search}:`, error);
      }
    }
  }

  const foundCount = rawCandidates.length;
  let filteredOut = 0;

  // ETAPA 2: Barreira de Validação e Reconsulta de Origem (Gatekeeper)
  // Agrupa IDs únicos para revalidar a existência e disponibilidade no marketplace
  const candidateIds = Array.from(new Set(rawCandidates.map((c) => c.externalProductId)));
  let verifiedOriginMap = new Map<string, ExternalProduct>();

  if (typeof (integration as any).getItemsBulk === 'function') {
    try {
      verifiedOriginMap = await (integration as any).getItemsBulk(candidateIds);
    } catch (err) {
      console.warn(`Bulk origin verification failed for ${marketplaceSlug}:`, err);
    }
  }

  for (const candidate of rawCandidates) {
    const externalId = candidate.externalProductId;
    // Se o item foi revalidado na origem, usa os dados atualizados em tempo real
    let productToValidate: ExternalProduct | null = verifiedOriginMap.get(externalId) || null;

    if (!productToValidate) {
      try {
        productToValidate = await integration.getProduct(externalId);
      } catch {
        productToValidate = null;
      }
    }

    // Se a consulta direta na origem não confirmou o produto ativo, descarta o candidato
    if (!productToValidate || !productToValidate.isAvailable) {
      filteredOut += 1;
      continue;
    }

    // Aplica a barreira estrita de validação de campos (Preço > 0, Imagem HTTP, URL direta)
    const validation = validateCandidateProduct(productToValidate, marketplaceSlug);
    if (!validation.isValid) {
      filteredOut += 1;
      console.warn(`[Gatekeeper] Produto ${externalId} rejeitado: ${validation.reason}`);
      continue;
    }

    discovered.set(`${marketplaceSlug}:${externalId}`, productToValidate);
  }

  // ETAPA 3: Persistência apenas de produtos aprovados pela barreira
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
    found: foundCount,
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
          try {
            if (typeof (integration as any).verifyProduct === 'function') {
              const check = await (integration as any).verifyProduct(product.external_product_id);
              // IMPORTANTE: Só marca OUT_OF_STOCK se o produto for expressamente confirmado como inexistente/inativo ('NOT_FOUND').
              // Se o status for 'ERROR' (500, 429, timeout), NÃO altera para OUT_OF_STOCK.
              if (check.status === 'NOT_FOUND') {
                await supabase.from('products').update({ status: 'OUT_OF_STOCK', last_synced_at: new Date().toISOString() }).eq('id', product.id);
              }
            } else {
              const available = await integration.getAvailability(product.external_product_id);
              if (available === false) {
                await supabase.from('products').update({ status: 'OUT_OF_STOCK', last_synced_at: new Date().toISOString() }).eq('id', product.id);
              }
            }
          } catch (availabilityErr) {
            console.warn(`[AvailabilityCheck] Falha temporária (500/429/timeout) ao verificar ${marketplaceSlug}/${product.external_product_id}. Status ativo mantido:`, availabilityErr);
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
