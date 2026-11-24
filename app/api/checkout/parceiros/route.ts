import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabase } from '@/lib/supabase';
import { buyerSchema, PartnerError, PartnerOrder, partnerOrderSchema, requirePartnerPayments } from '@/lib/partner';
import { assertPartnerOrigin, limitPartnerRequests, partnerApiError, readPartnerJson } from '@/lib/partnerAuth';
import { createPartnerCheckout, partnerAccessToken } from '@/services/partnerPayments';

export const runtime = 'edge';
export async function GET(request: NextRequest) {
  try {
    const id = z.string().uuid().parse(request.nextUrl.searchParams.get('pedido'));
    const token = z.string().uuid().parse(request.nextUrl.searchParams.get('token'));
    await limitPartnerRequests(request, 'receipt', 60);
    const { data, error } = await getSupabase().from('partner_orders')
      .select('id,product_name,total_cents,status,fulfillment_status,tracking_code,seller:partners(store_name,email,phone)')
      .eq('id', id).eq('receipt_token', token).maybeSingle();
    if (error) throw error;
    if (!data) throw new PartnerError('Acompanhamento não encontrado.', 404);
    return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' } });
  } catch (error) { return partnerApiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    assertPartnerOrigin(request);
    const config = requirePartnerPayments();
    const input = z.object({ id: z.string().uuid(), product_id: z.string().uuid(), buyer: buyerSchema,
      accepted_terms: z.literal(true) }).parse(await readPartnerJson(request));
    await limitPartnerRequests(request, 'checkout', 5);
    const db = getSupabase();
    const { data: existing, error: existingError } = await db.from('partner_orders').select('*').eq('id', input.id).maybeSingle<PartnerOrder>();
    if (existingError) throw existingError;
    if (existing) {
      if (existing.product_id !== input.product_id || existing.buyer.email !== input.buyer.email) throw new PartnerError('Pedido incompatível.', 409);
      if (existing.status !== 'PENDING' || new Date(existing.expires_at).getTime() <= Date.now()) throw new PartnerError('Pedido encerrado. Inicie uma nova compra.', 409);
      if (existing.checkout_url) return NextResponse.json({ checkout_url: existing.checkout_url });
      // An unknown provider result must be reconciled, not create a second preference.
      throw new PartnerError('Pedido em preparação. Aguarde ou contate o vendedor antes de tentar novamente.', 409);
    }
    const { data: product, error: productError } = await db.from('partner_products').select('partner_id').eq('id', input.product_id).single<{ partner_id: string }>();
    if (productError) throw new PartnerError('Produto indisponível.', 404);
    await partnerAccessToken(product.partner_id);
    const { data, error } = await db.rpc('reserve_partner_order', {
      p_id: input.id, p_product_id: input.product_id, p_buyer: input.buyer, p_commission_bps: config.commissionBps,
    });
    if (error) throw new PartnerError('Produto sem estoque ou vendedor não habilitado. Atualize a página.', 409);
    if (!data) throw new Error('Reserva não retornou o pedido.');
    return NextResponse.json({ checkout_url: await createPartnerCheckout(partnerOrderSchema.parse(data)) });
  } catch (error) { return partnerApiError(error); }
}
