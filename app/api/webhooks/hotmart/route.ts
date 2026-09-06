import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
  const expectedToken = process.env.HOTMART_WEBHOOK_TOKEN;
  const receivedToken = String(payload?.hottok || request.headers.get('x-hotmart-hottok') || '');

  if (!expectedToken || receivedToken !== expectedToken) {
    return NextResponse.json({ error: 'Webhook não autorizado.' }, { status: 401 });
  }

  const eventId = String(payload?.id || payload?.event_id || payload?.transaction || '');
  if (!eventId) {
    return NextResponse.json({ error: 'Evento sem identificador único.' }, { status: 400 });
  }

  const eventType = typeof payload?.event === 'string' ? payload.event : typeof payload?.event_type === 'string' ? payload.event_type : null;
  const eventStatus = typeof payload?.status === 'string' ? payload.status : null;
  const { error } = await getSupabase().from('hotmart_events').upsert({
    event_id: eventId,
    event_type: eventType,
    event_status: eventStatus,
    payload,
  }, { onConflict: 'event_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ received: true });
}