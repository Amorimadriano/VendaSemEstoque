import { getMarketplaceIntegration } from '@/integrations';
import { AffiliateConversionReport } from '@/integrations/MarketplaceIntegration';
import { getSupabase } from '@/lib/supabase';

const MARKETPLACES = ['aliexpress', 'shopee'] as const;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type MarketplaceResult = {
  marketplace: string;
  received: number;
  imported: number;
  updated: number;
  skipped: number;
  error?: string;
};

function validDate(value?: string) {
  if (!value) return new Date().toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

async function saveReport(marketplaceId: string, report: AffiliateConversionReport) {
  const supabase = getSupabase();
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id')
    .eq('marketplace_id', marketplaceId)
    .eq('external_product_id', report.externalProductId)
    .maybeSingle();
  if (productError) throw productError;
  if (!product) return 'skipped' as const;

  let clickId: string | null = null;
  if (report.clickId && UUID_PATTERN.test(report.clickId)) {
    const { data: click, error: clickError } = await supabase.from('clicks').select('id').eq('id', report.clickId).maybeSingle();
    if (clickError) throw clickError;
    clickId = click?.id || null;
  }
  const { data: existing, error: existingError } = await supabase
    .from('conversions')
    .select('id')
    .eq('marketplace_id', marketplaceId)
    .eq('order_external_id', report.orderExternalId)
    .maybeSingle();
  if (existingError) throw existingError;

  const conversionData = {
    click_id: clickId,
    product_id: product.id,
    marketplace_id: marketplaceId,
    order_external_id: report.orderExternalId,
    sale_value: report.saleValue,
    commission_value: report.commissionValue,
    status: report.status,
  };

  let conversionId = existing?.id;
  if (conversionId) {
    const { error } = await supabase.from('conversions').update(conversionData).eq('id', conversionId);
    if (error) throw error;
  } else {
    conversionId = crypto.randomUUID();
    const { error } = await supabase.from('conversions').insert({ id: conversionId, created_at: validDate(report.occurredAt), ...conversionData });
    if (error) throw error;
  }

  const { data: existingCommission, error: commissionReadError } = await supabase.from('commissions').select('id').eq('conversion_id', conversionId).maybeSingle();
  if (commissionReadError) throw commissionReadError;
  const commissionData = { amount: report.commissionValue, status: report.status, updated_at: new Date().toISOString() };
  const commissionError = existingCommission
    ? (await supabase.from('commissions').update(commissionData).eq('id', existingCommission.id)).error
    : (await supabase.from('commissions').insert({ id: crypto.randomUUID(), conversion_id: conversionId, ...commissionData })).error;
  if (commissionError) throw commissionError;

  const { count: conversionCount, error: countError } = await supabase
    .from('conversions')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', product.id)
    .in('status', ['APPROVED', 'PAID']);
  if (countError) throw countError;
  const { data: metric, error: metricReadError } = await supabase.from('product_metrics').select('id,total_clicks').eq('product_id', product.id).maybeSingle();
  if (metricReadError) throw metricReadError;
  const totalConversions = conversionCount || 0;
  const totalClicks = metric?.total_clicks || 0;
  const { data: commissionRows, error: commissionRowsError } = await supabase
    .from('conversions')
    .select('commission_value')
    .eq('product_id', product.id)
    .in('status', ['APPROVED', 'PAID']);
  if (commissionRowsError) throw commissionRowsError;
  const totalCommission = (commissionRows || []).reduce((sum, row) => sum + Number(row.commission_value || 0), 0);
  const { error: metricError } = await supabase.from('product_metrics').upsert({
    id: metric?.id || crypto.randomUUID(),
    product_id: product.id,
    total_conversions: totalConversions,
    conversion_rate: totalClicks > 0 ? Number(((totalConversions / totalClicks) * 100).toFixed(2)) : 0,
    total_commission: Number(totalCommission.toFixed(2)),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'product_id' });
  if (metricError) throw metricError;

  return existing ? 'updated' as const : 'imported' as const;
}

export async function syncAffiliateConversions(startDate = new Date(Date.now() - 7 * 86400000), endDate = new Date()) {
  const supabase = getSupabase();
  const results: MarketplaceResult[] = [];

  for (const slug of MARKETPLACES) {
    const stats: MarketplaceResult = { marketplace: slug, received: 0, imported: 0, updated: 0, skipped: 0 };
    try {
      const { data: marketplace, error } = await supabase.from('marketplaces').select('id').eq('slug', slug).maybeSingle();
      if (error) throw error;
      if (!marketplace) throw new Error(`Marketplace ${slug} não cadastrado.`);
      const reports = await getMarketplaceIntegration(slug).getConversions(startDate, endDate);
      stats.received = reports.length;
      for (const report of reports) {
        const action = await saveReport(marketplace.id, report);
        stats[action] += 1;
      }
    } catch (error) {
      stats.error = error instanceof Error ? error.message : String(error);
    }
    results.push(stats);
  }

  return { startDate: startDate.toISOString(), endDate: endDate.toISOString(), results };
}
