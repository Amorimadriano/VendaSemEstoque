import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'edge';

export async function GET() {
  return NextResponse.json({ status: 'ready' });
}

function numericValue(value: unknown) {
  return typeof value === 'number' ? value : Number(value || 0);
}

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
  const eventData = payload?.data as Record<string, unknown> | undefined;
  const purchase = eventData?.purchase as Record<string, unknown> | undefined;
  const expectedToken = process.env.HOTMART_WEBHOOK_TOKEN;
  const receivedToken = String(
    payload?.hottok ||
    eventData?.hottok ||
    request.headers.get('x-hotmart-hottok') ||
    request.headers.get('hottok') ||
    request.nextUrl.searchParams.get('hottok') ||
    ''
  );

  if (!expectedToken) {
    return NextResponse.json({ error: 'Webhook não configurado.', reason: 'HOTMART_WEBHOOK_TOKEN ausente no ambiente de produção.' }, { status: 503 });
  }

  if (receivedToken !== expectedToken) {
    return NextResponse.json({ error: 'Webhook não autorizado.', reason: 'Hottok ausente ou diferente da Secret de produção.' }, { status: 401 });
  }

  const eventId = String(payload?.id || payload?.event_id || payload?.transaction || eventData?.id || eventData?.transaction || purchase?.transaction || `hotmart-${crypto.randomUUID()}`);

  const eventType = typeof payload?.event === 'string' ? payload.event : typeof payload?.event_type === 'string' ? payload.event_type : typeof eventData?.event === 'string' ? eventData.event : null;
  const eventStatus = typeof payload?.status === 'string' ? payload.status : typeof eventData?.status === 'string' ? eventData.status : typeof purchase?.status === 'string' ? purchase.status : null;
  const { error } = await getSupabase().from('hotmart_events').upsert({
    event_id: eventId,
    event_type: eventType,
    event_status: eventStatus,
    payload,
  }, { onConflict: 'event_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const productData = eventData?.product as Record<string, unknown> | undefined;
  const externalProductId = String(productData?.ucode || productData?.external_id || productData?.id || '');
  const orderId = String(purchase?.transaction || '');
  const normalizedEvent = String(eventType || '').toUpperCase();

  if (!externalProductId || !orderId || !['PURCHASE_APPROVED', 'PURCHASE_REFUNDED', 'PURCHASE_CANCELED'].includes(normalizedEvent)) {
    return NextResponse.json({ received: true, processed: false });
  }

  const supabase = getSupabase();
  const { data: hotmart } = await supabase.from('marketplaces').select('id').eq('slug', 'hotmart').maybeSingle();
  if (!hotmart) return NextResponse.json({ received: true, processed: false, reason: 'Marketplace Hotmart não cadastrado.' });

  const { data: product } = await supabase.from('products').select('id').eq('marketplace_id', hotmart.id).eq('external_product_id', externalProductId).maybeSingle();
  if (!product) return NextResponse.json({ received: true, processed: false, reason: 'Produto Hotmart não mapeado.' });

  const { data: existingConversion } = await supabase.from('conversions').select('id').eq('order_external_id', orderId).maybeSingle();
  const isApproved = normalizedEvent === 'PURCHASE_APPROVED';
  const status = isApproved ? 'APPROVED' : 'CANCELLED';
  const price = purchase?.price as Record<string, unknown> | undefined;
  const saleValue = numericValue(price?.value);
  const affiliates = eventData?.affiliates as Array<Record<string, unknown>> | undefined;
  const commissions = eventData?.commissions as Array<Record<string, unknown>> | undefined;
  const isOwnAffiliate = Boolean(process.env.HOTMART_AFFILIATE_CODE) && affiliates?.some((affiliate) => affiliate.affiliate_code === process.env.HOTMART_AFFILIATE_CODE);
  const commissionValue = isOwnAffiliate ? (commissions || []).reduce((total, commission) => total + numericValue(commission.value), 0) : 0;

  let conversionId = existingConversion?.id;
  if (conversionId) {
    const { error: conversionError } = await supabase.from('conversions').update({ sale_value: saleValue, commission_value: commissionValue, status }).eq('id', conversionId);
    if (conversionError) return NextResponse.json({ error: conversionError.message }, { status: 500 });
  } else if (isApproved) {
    conversionId = crypto.randomUUID();
    const { error: conversionError } = await supabase.from('conversions').insert({ id: conversionId, product_id: product.id, marketplace_id: hotmart.id, order_external_id: orderId, sale_value: saleValue, commission_value: commissionValue, status });
    if (conversionError) return NextResponse.json({ error: conversionError.message }, { status: 500 });
  }

  if (conversionId) {
    const { data: existingCommission } = await supabase.from('commissions').select('id').eq('conversion_id', conversionId).maybeSingle();
    const commissionData = { amount: commissionValue, status, updated_at: new Date().toISOString() };
    const commissionError = existingCommission
      ? (await supabase.from('commissions').update(commissionData).eq('id', existingCommission.id)).error
      : (await supabase.from('commissions').insert({ id: crypto.randomUUID(), conversion_id: conversionId, ...commissionData, created_at: new Date().toISOString() })).error;
    if (commissionError) return NextResponse.json({ error: commissionError.message }, { status: 500 });
  }

  await supabase.from('hotmart_events').update({ processed_at: new Date().toISOString() }).eq('event_id', eventId);
  return NextResponse.json({ received: true, processed: Boolean(conversionId) });
}