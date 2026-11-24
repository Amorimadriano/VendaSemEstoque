import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PartnerError } from '@/lib/partner';
import { partnerApiError, readPartnerJson } from '@/lib/partnerAuth';
import { getSupabase } from '@/lib/supabase';
import { syncPartnerPayment, verifyMercadoPagoSignature } from '@/services/partnerPayments';

export const runtime = 'edge';
export async function POST(request: NextRequest) {
  try {
    const paymentId = request.nextUrl.searchParams.get('data.id') || '';
    if (!await verifyMercadoPagoSignature(request, paymentId)) throw new PartnerError('Assinatura de pagamento inválida.', 401);
    let partnerId = request.nextUrl.searchParams.get('partner_id');
    if (!partnerId) {
      const body = z.object({ user_id: z.union([z.string().regex(/^\d+$/), z.number().int().safe().nonnegative()]) })
        .parse(await readPartnerJson(request));
      const { data, error } = await getSupabase().from('partner_payment_accounts').select('partner_id')
        .eq('provider_user_id', String(body.user_id)).maybeSingle<{ partner_id: string }>();
      if (error) throw error;
      if (!data) throw new PartnerError('Conta de pagamento não encontrada.', 404);
      partnerId = data.partner_id;
    }
    z.string().uuid().parse(partnerId);
    await syncPartnerPayment(partnerId, paymentId);
    return NextResponse.json({ received: true });
  } catch (error) { return partnerApiError(error); }
}
