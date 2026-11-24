import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { PartnerError, PartnerOrder, partnerPaymentConfig } from '@/lib/partner';
import { partnerApiError } from '@/lib/partnerAuth';
import { reconcilePartnerOrder } from '@/services/partnerPayments';

export const runtime = 'edge';
export async function POST(request: NextRequest) {
  try {
    const secret = process.env.AUTOMATION_API_SECRET;
    if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) throw new PartnerError('Automação não autorizada.', 401);
    const db = getSupabase();
    const { error: stateError } = await db.from('partner_oauth_states').delete().lt('expires_at', new Date().toISOString());
    if (stateError) throw stateError;
    const { error: rateError } = await db.from('partner_rate_limits').delete().lt('reset_at', new Date(Date.now() - 86400000).toISOString());
    if (rateError) throw rateError;
    if (!partnerPaymentConfig().configured) return NextResponse.json({ status: 'NOT_CONFIGURED', reconciled: 0 });
    const { data, error } = await db.from('partner_orders').select('*')
      .in('status', ['PENDING','PAID','PARTIALLY_REFUNDED','DISPUTED','REVIEW'])
      .order('last_payment_check_at', { ascending: true, nullsFirst: true }).limit(20).returns<PartnerOrder[]>();
    if (error) throw error;
    const errors: string[] = [];
    for (const order of data || []) {
      try { await reconcilePartnerOrder(order); }
      catch (error) {
        console.error('[PartnerReconciliation]', order.id, error instanceof Error ? error.message : error);
        errors.push(order.id);
      }
    }
    return NextResponse.json({ reconciled: (data?.length || 0) - errors.length, failedOrderIds: errors }, { status: errors.length ? 502 : 200 });
  } catch (error) { return partnerApiError(error); }
}
