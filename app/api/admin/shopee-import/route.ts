import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { ShopeeIntegration } from '@/integrations/shopee/ShopeeIntegration';
import { inferCategory } from '@/services/productCategory';
import { resolveShopeeAffiliateUrl } from '@/services/shopeeLinkImport';

export const runtime = 'edge';

function toSlug(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const rawUrls: unknown = body && typeof body === 'object' ? (body as { urls?: unknown }).urls : undefined;
  const urls: string[] = Array.isArray(rawUrls)
    ? [...new Set(rawUrls.filter((url): url is string => typeof url === 'string').map((url) => url.trim()).filter(Boolean))]
    : [];

  if (!urls.length) return NextResponse.json({ error: 'Informe ao menos um link Shopee.' }, { status: 400 });
  if (urls.length > 5) return NextResponse.json({ error: 'Importe no máximo cinco links por lote.' }, { status: 400 });

  const supabase = getSupabase();
  const now = new Date().toISOString();
  const { data: existingMarketplace, error: existingMarketplaceError } = await supabase
    .from('marketplaces')
    .select('id')
    .eq('slug', 'shopee')
    .maybeSingle();
  if (existingMarketplaceError) return NextResponse.json({ error: existingMarketplaceError.message }, { status: 500 });

  const { data: marketplace, error: marketplaceError } = await supabase
    .from('marketplaces')
    .upsert({ id: existingMarketplace?.id || crypto.randomUUID(), name: 'Shopee', slug: 'shopee', affiliate_status: 'ACTIVE', api_status: 'ACTIVE', updated_at: now, ...(existingMarketplace ? {} : { created_at: now }) }, { onConflict: 'slug' })
    .select('id')
    .single();

  if (marketplaceError || !marketplace) {
    return NextResponse.json({ error: marketplaceError?.message || 'Não foi possível preparar a Shopee.' }, { status: 500 });
  }

  const shopeeIntegration = new ShopeeIntegration();
  const results = [];
  for (const affiliateUrl of urls) {
    try {
      const item = await resolveShopeeAffiliateUrl(affiliateUrl, async (externalProductId) => {
        const candidates = await shopeeIntegration.getProducts(externalProductId, undefined, 50);
        const product = candidates.find((candidate) => candidate.externalProductId === externalProductId);
        if (!product?.originalUrl) return null;
        return {
          productUrl: product.originalUrl,
          externalProductId: product.externalProductId,
          name: product.name,
          description: product.description,
          imageUrl: product.imageUrl,
          price: product.price,
          oldPrice: product.oldPrice,
          commissionPercentage: product.commissionPercentage,
        };
      });
      const inferredCategory = inferCategory(item.name, 'Shopee');
      const { data: existingCategory, error: existingCategoryError } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', inferredCategory.slug)
        .maybeSingle();
      if (existingCategoryError) throw existingCategoryError;

      const { data: category, error: categoryError } = await supabase
        .from('categories')
        .upsert({ id: existingCategory?.id || crypto.randomUUID(), name: inferredCategory.name, slug: inferredCategory.slug, updated_at: now, ...(existingCategory ? {} : { created_at: now }) }, { onConflict: 'slug' })
        .select('id')
        .single();
      if (categoryError || !category) throw new Error(categoryError?.message || 'Não foi possível salvar a categoria.');

      const { data: currentProduct, error: currentProductError } = await supabase
        .from('products')
        .select('id')
        .eq('marketplace_id', marketplace.id)
        .eq('external_product_id', item.externalProductId)
        .maybeSingle();
      if (currentProductError) throw currentProductError;

      const commissionPercentage = item.commissionPercentage || Number(process.env.SHOPEE_DEFAULT_COMMISSION_PERCENTAGE) || 10;
      const discountPercentage = item.oldPrice ? Math.round(((item.oldPrice - item.price) / item.oldPrice) * 100) : null;
      const productId = currentProduct?.id || crypto.randomUUID();
      const productData = {
        id: productId,
        name: item.name.slice(0, 120),
        slug: `${toSlug(item.name).slice(0, 150) || 'produto-shopee'}-${item.externalProductId}`.slice(0, 190),
        description: item.description.slice(0, 5000),
        category_id: category.id,
        marketplace_id: marketplace.id,
        image_url: item.imageUrl,
        images: JSON.stringify([item.imageUrl]),
        price: item.price,
        old_price: item.oldPrice || null,
        discount_percentage: discountPercentage,
        rating: 0,
        review_count: 0,
        sales_count: 0,
        commission_percentage: commissionPercentage,
        commission_value: Math.round(item.price * commissionPercentage) / 100,
        external_product_id: item.externalProductId,
        original_url: item.productUrl,
        affiliate_url: item.affiliateUrl,
        last_synced_at: now,
        updated_at: now,
        status: 'ACTIVE',
        ...(currentProduct ? {} : { created_at: now }),
      };

      const { error: productError } = await supabase
        .from('products')
        .upsert(productData, { onConflict: 'marketplace_id,external_product_id' });
      if (productError) throw productError;

      const { error: metricsError } = await supabase
        .from('product_metrics')
        .upsert({ id: crypto.randomUUID(), product_id: productId, updated_at: now }, { onConflict: 'product_id' });
      if (metricsError) console.warn('[ShopeeImport] Não foi possível criar métricas:', metricsError.message);

      results.push({ affiliateUrl, status: 'imported', name: item.name, productUrl: item.productUrl });
    } catch (error) {
      results.push({ affiliateUrl, status: 'error', message: error instanceof Error ? error.message : 'Falha ao importar este link.' });
    }
  }

  return NextResponse.json({ results, imported: results.filter((result) => result.status === 'imported').length });
}