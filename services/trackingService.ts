import { AffiliateClickData } from '@/types';
import { getSupabase } from '@/lib/supabase';

export function appendMarketplaceTracking(url: string, marketplaceSlug: string | undefined, trackingId: string) {
  const affiliateUrl = new URL(url);
  const parameter = marketplaceSlug === 'amazon' ? 'ascsubtag'
    : marketplaceSlug === 'shopee' ? 'sub_id'
      : marketplaceSlug === 'mercadolivre' ? 'matt_word'
        : marketplaceSlug === 'aliexpress' ? 'aff_platform'
          : 'subid_click';
  affiliateUrl.searchParams.set(parameter, trackingId);
  return affiliateUrl.toString();
}

export async function getAffiliateUrlForProduct(productId: string): Promise<string> {
  const { data: product, error } = await getSupabase().from('products').select('affiliate_url').eq('id', productId).maybeSingle();
  if (error) throw error;
  if (!product?.affiliate_url) throw new Error('Produto não encontrado');
  return product.affiliate_url;
}

export async function registerClickAndGetAffiliateUrl(data: AffiliateClickData): Promise<string> {
  const supabase = getSupabase();
  const { data: product, error: productError } = await supabase.from('products').select('id,affiliate_url,marketplace:marketplaces(slug)').eq('id', data.productId).maybeSingle();
  if (productError) throw productError;
  if (!product?.affiliate_url) throw new Error('Produto não encontrado');

  const clickId = crypto.randomUUID();
  const { data: click, error: clickError } = await supabase.from('clicks').insert({
    id: clickId,
    product_id: data.productId,
    affiliate_link_id: data.affiliateLinkId || null,
    session_id: data.sessionId || `sess_${crypto.randomUUID()}`,
    user_id: data.userId || null,
    utm_source: data.utmSource || null,
    utm_medium: data.utmMedium || null,
    utm_campaign: data.utmCampaign || null,
    device: data.device || 'desktop',
    ip_hash: data.ipHash || null,
    created_at: new Date().toISOString(),
  }).select('id').single();
  if (clickError) console.warn('Could not record affiliate click:', clickError.message);

  const { data: metric } = await supabase.from('product_metrics').select('id,total_clicks').eq('product_id', data.productId).maybeSingle();
  const { error: metricError } = await supabase.from('product_metrics').upsert({
    id: metric?.id || crypto.randomUUID(),
    product_id: data.productId,
    total_clicks: (metric?.total_clicks || 0) + 1,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'product_id' });
  if (metricError) console.warn('Could not update product metrics:', metricError.message);

  const marketplace = product.marketplace as { slug?: string } | null;
  const trackingId = click?.id || clickId;
  return appendMarketplaceTracking(product.affiliate_url, marketplace?.slug, trackingId);
}

export async function registerConversion(
  clickId: string | null,
  productId: string,
  marketplaceId: string,
  orderExternalId: string,
  saleValue: number,
  commissionValue: number
) {
  const supabase = getSupabase();
  const { data: conversion, error } = await supabase.from('conversions').insert({
    click_id: clickId || null,
    product_id: productId,
    marketplace_id: marketplaceId,
    order_external_id: orderExternalId,
    sale_value: saleValue,
    commission_value: commissionValue,
    status: 'PENDING',
  }).select().single();
  if (error) throw error;

  const { error: commissionError } = await supabase.from('commissions').insert({
    conversion_id: conversion.id,
    amount: commissionValue,
    status: 'PENDING',
  });
  if (commissionError) throw commissionError;
  return conversion;
}
