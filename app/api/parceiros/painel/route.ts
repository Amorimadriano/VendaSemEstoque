import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabase } from '@/lib/supabase';
import { commissionBps, PartnerError, partnerPaymentConfig, partnerProductSchema, PARTNER_TERMS_VERSION } from '@/lib/partner';
import { assertPartnerOrigin, limitPartnerRequests, partnerApiError, readPartnerJson, requirePartner } from '@/lib/partnerAuth';

export const runtime = 'edge';
const actionSchema = z.discriminatedUnion('action', [
  partnerProductSchema.extend({ action: z.literal('product'), expected_updated_at: z.string().datetime({ offset: true }).optional() }),
  z.object({ action: z.literal('accept_commission'), bps: z.number().int() }),
  z.object({ action: z.literal('pause_product'), id: z.string().uuid() }),
  z.object({ action: z.literal('fulfillment'), id: z.string().uuid(), status: z.enum(['SHIPPED','DELIVERED']), tracking_code: z.string().trim().min(3).max(100) }),
]);

export async function GET(request: NextRequest) {
  try {
    const partner = await requirePartner(request);
    const db = getSupabase();
    const [products, orders, account] = await Promise.all([
      db.from('partner_products').select('*').eq('partner_id', partner.id).order('created_at', { ascending: false }).limit(200),
      db.from('partner_orders').select('*').eq('partner_id', partner.id).order('created_at', { ascending: false }).limit(200),
      db.from('partner_payment_accounts').select('provider_user_id,live_mode').eq('partner_id', partner.id).maybeSingle(),
    ]);
    if (products.error) throw products.error;
    if (orders.error) throw orders.error;
    if (account.error) throw account.error;
    // Buyer details are available to the seller only after an approved payment.
    const sellerOrders = (orders.data || []).map((order) => ({
      ...order, buyer: ['PAID','PARTIALLY_REFUNDED'].includes(order.status) ? order.buyer : null,
    }));
    return NextResponse.json({ partner, products: products.data, orders: sellerOrders, paymentAccount: account.data, payments: partnerPaymentConfig() },
      { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return partnerApiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    assertPartnerOrigin(request);
    const partner = await requirePartner(request);
    await limitPartnerRequests(request, 'partner-write', 60, partner.id);
    const body = actionSchema.parse(await readPartnerJson(request));
    if (partner.status === 'SUSPENDED' && ['product', 'accept_commission'].includes(body.action)) {
      throw new PartnerError('Conta suspensa para novas vendas. O acompanhamento de pedidos anteriores continua disponível.', 403);
    }
    const db = getSupabase();
    if (body.action === 'accept_commission') {
      const bps = commissionBps();
      if (!bps || body.bps !== bps) throw new PartnerError('O percentual mudou ou ainda não está definido. Atualize a página.');
      const { error } = await db.from('partners').update({ accepted_commission_bps: bps, commission_accepted_at: new Date().toISOString(),
        terms_version: PARTNER_TERMS_VERSION, updated_at: new Date().toISOString() }).eq('id', partner.id);
      if (error) throw error;
    } else if (body.action === 'product') {
      const { id, action: _action, expected_updated_at, ...data } = body;
      if (id && !expected_updated_at) throw new PartnerError('Atualize o painel antes de editar o produto.', 409);
      const payload = { ...data, status: 'PENDING_REVIEW', review_note: null, updated_at: new Date().toISOString() };
      const result = id
        ? await db.from('partner_products').update(payload).eq('id', id).eq('partner_id', partner.id)
          .eq('updated_at', expected_updated_at).select('id').single()
        : await db.from('partner_products').insert({ ...payload, partner_id: partner.id }).select('id').single();
      if (result.error) {
        if (result.error.code === 'PGRST116') throw new PartnerError('Produto alterado ou não encontrado. Atualize o painel para preservar as reservas de estoque.', 409);
        throw result.error;
      }
    } else if (body.action === 'pause_product') {
      const { error } = await db.from('partner_products').update({ status: 'INACTIVE', updated_at: new Date().toISOString() })
        .eq('id', body.id).eq('partner_id', partner.id).select('id').single();
      if (error) throw error;
    } else {
      const { error } = await db.from('partner_orders').update({ fulfillment_status: body.status, tracking_code: body.tracking_code,
        updated_at: new Date().toISOString() }).eq('id', body.id).eq('partner_id', partner.id)
        .in('status', ['PAID','PARTIALLY_REFUNDED']).select('id').single();
      if (error) throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (error) { return partnerApiError(error); }
}
