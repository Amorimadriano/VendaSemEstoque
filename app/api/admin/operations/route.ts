import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'edge';

export async function GET() {
  const supabase = getSupabase();
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const [runsResult, syncResult, errorsResult, clicksResult, conversionsResult] = await Promise.all([
    supabase.from('automation_runs').select('*').order('created_at', { ascending: false }).limit(20),
    supabase.from('marketplace_sync_logs').select('*').order('created_at', { ascending: false }).limit(40),
    supabase.from('marketing_content').select('id,channel,publication_error,updated_at').not('publication_error', 'is', null).order('updated_at', { ascending: false }).limit(10),
    supabase.from('clicks').select('utm_source').gte('created_at', since),
    supabase.from('conversions').select('marketplace:marketplaces(slug),click:clicks(utm_source),sale_value,commission_value,status').gte('created_at', since),
  ]);
  const error = runsResult.error || syncResult.error || errorsResult.error || clicksResult.error || conversionsResult.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const latestByMarketplace = new Map<string, any>();
  for (const log of syncResult.data || []) if (!latestByMarketplace.has(log.marketplace_slug)) latestByMarketplace.set(log.marketplace_slug, log);
  const clicksBySource = (clicksResult.data || []).reduce<Record<string, number>>((acc, click) => {
    const source = click.utm_source || 'site';
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {});
  const conversionsByChannel = (conversionsResult.data || []).reduce<Record<string, { conversions: number; sales: number; commission: number }>>((acc, conversion: any) => {
    const source = conversion.click?.utm_source || conversion.marketplace?.slug || 'desconhecido';
    acc[source] ||= { conversions: 0, sales: 0, commission: 0 };
    acc[source].conversions += 1;
    acc[source].sales += Number(conversion.sale_value || 0);
    acc[source].commission += Number(conversion.commission_value || 0);
    return acc;
  }, {});

  const alerts: Array<{ severity: 'warning' | 'error'; message: string }> = [];
  for (const run of runsResult.data || []) if (run.status === 'FAILED') alerts.push({ severity: 'error', message: `${run.workflow}: ${run.error || 'execução falhou'}` });
  for (const log of latestByMarketplace.values()) {
    if (['FAILED', 'MISSING_CREDENTIALS'].includes(log.status)) alerts.push({ severity: 'error', message: `${log.marketplace_slug}: ${log.error_message || log.status}` });
    if (Date.now() - new Date(log.created_at).getTime() > 36 * 3600000) alerts.push({ severity: 'warning', message: `${log.marketplace_slug} sem sincronização há mais de 36 horas.` });
  }
  for (const item of errorsResult.data || []) alerts.push({ severity: 'warning', message: `${item.channel}: ${item.publication_error}` });

  return NextResponse.json({
    runs: runsResult.data || [],
    integrations: [...latestByMarketplace.values()],
    alerts: alerts.slice(0, 12),
    funnel: Object.entries(clicksBySource).map(([channel, clicks]) => ({ channel, clicks, ...(conversionsByChannel[channel] || { conversions: 0, sales: 0, commission: 0 }) })),
  });
}
