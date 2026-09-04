import { AffiliateClickData } from '@/types';
import { getSupabase } from '@/lib/supabase';

export async function registerClickAndGetAffiliateUrl(data: AffiliateClickData): Promise<string> {
  const supabase = getSupabase();
  const { data: product, error: productError } = await supabase.from('products').select('id,affiliate_url').eq('id', data.productId).maybeSingle();
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

  const affiliateUrl = new URL(product.affiliate_url);
  affiliateUrl.searchParams.set('subid_click', click?.id || clickId);
  return affiliateUrl.toString();
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
