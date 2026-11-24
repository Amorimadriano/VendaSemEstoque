import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { COOKIE_NAME, verifyAdminSession } from '@/lib/adminAuth';
import { getSupabase } from '@/lib/supabase';
import { partnerApiError, assertPartnerOrigin, readPartnerJson, partnerFields } from '@/lib/partnerAuth';
import { PartnerError, PartnerOrder, partnerPaymentConfig } from '@/lib/partner';
import { reconcilePartnerOrder } from '@/services/partnerPayments';

export const runtime = 'edge';
async function requireAdmin(request: NextRequest) {
  if (!await verifyAdminSession(request.cookies.get(COOKIE_NAME)?.value)) throw new PartnerError('Não autorizado.', 401);
}
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const db = getSupabase();
    const [partners, products, orders] = await Promise.all([
      db.from('partners').select(partnerFields).order('created_at', { ascending: false }).limit(200),
      db.from('partner_products').select('*').order('created_at', { ascending: false }).limit(200),
      db.from('partner_orders').select('id,partner_id,product_name,total_cents,status,earned_commission_cents,paid_cents,refunded_cents,created_at')
        .order('created_at', { ascending: false }).limit(200),
    ]);
    if (partners.error) throw partners.error;
    if (products.error) throw products.error;
    if (orders.error) throw orders.error;
    return NextResponse.json({ partners: partners.data, products: products.data, orders: orders.data, payments: partnerPaymentConfig() },
      { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return partnerApiError(error); }
}
export async function PATCH(request: NextRequest) {
  try {
    assertPartnerOrigin(request);
    await requireAdmin(request);
    const input = z.discriminatedUnion('target', [
      z.object({ target: z.literal('partner'), id: z.string().uuid(), status: z.enum(['ACTIVE','SUSPENDED','PENDING']), review_note: z.string().trim().min(3).max(1000) }),
      z.object({ target: z.literal('product'), id: z.string().uuid(), status: z.enum(['ACTIVE','REJECTED','INACTIVE']), review_note: z.string().trim().min(3).max(1000) }),
      z.object({ target: z.literal('reconcile'), id: z.string().uuid() }),
    ]).parse(await readPartnerJson(request));
    const db = getSupabase();
    if (input.target === 'reconcile') {
      const { data, error } = await db.from('partner_orders').select('*').eq('id', input.id).single<PartnerOrder>();
      if (error) throw error;
      await reconcilePartnerOrder(data);
    } else {
      if (input.target === 'product' && input.status === 'ACTIVE') {
        const { data, error } = await db.from('partner_products').select('seller:partners!inner(status)').eq('id', input.id)
          .eq('seller.status', 'ACTIVE').maybeSingle();
        if (error) throw error;
        if (!data) throw new PartnerError('Aprove o vendedor antes de publicar o produto.', 409);
      }
      const { error } = await db.from(input.target === 'partner' ? 'partners' : 'partner_products')
        .update({ status: input.status, review_note: input.review_note, updated_at: new Date().toISOString() })
        .eq('id', input.id).select('id').single();
      if (error) throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (error) { return partnerApiError(error); }
}
