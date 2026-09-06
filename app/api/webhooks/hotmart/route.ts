import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'edge';

export async function GET() {
  return NextResponse.json({ status: 'ready' });
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

  if (!expectedToken || receivedToken !== expectedToken) {
    return NextResponse.json({ error: 'Webhook não autorizado.' }, { status: 401 });
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
  return NextResponse.json({ received: true });
}