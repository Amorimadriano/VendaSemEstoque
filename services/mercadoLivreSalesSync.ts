import { getSupabase } from '@/lib/supabase';

type MercadoLivreOrder = {
  id: number;
  status: string;
  order_items?: Array<{
    quantity?: number;
    unit_price?: number;
    item?: { id?: string };
  }>;
};

async function getAccessToken() {
  const accessToken = process.env.MERCADOLIVRE_ACCESS_TOKEN;
  if (!accessToken) throw new Error('MERCADOLIVRE_ACCESS_TOKEN não configurado.');
  return accessToken;
}

export async function syncMercadoLivreSales(limit = 50) {
  const accessToken = await getAccessToken();
  const headers = { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' };
  const profileResponse = await fetch('https://api.mercadolibre.com/users/me', { headers });
  if (!profileResponse.ok) throw new Error(`Mercado Livre users/me retornou ${profileResponse.status}. Renove o OAuth token.`);
  const profile = await profileResponse.json() as { id?: number };
  if (!profile.id) throw new Error('Mercado Livre não retornou o identificador do vendedor.');

  const ordersUrl = new URL('https://api.mercadolibre.com/orders/search');
  ordersUrl.searchParams.set('seller', String(profile.id));
  ordersUrl.searchParams.set('sort', 'date_desc');
  ordersUrl.searchParams.set('limit', String(Math.min(limit, 50)));
  const ordersResponse = await fetch(ordersUrl, { headers });
  if (!ordersResponse.ok) throw new Error(`Mercado Livre orders/search retornou ${ordersResponse.status}.`);
  const orderPayload = await ordersResponse.json() as { results?: MercadoLivreOrder[] };
  const orders = orderPayload.results || [];

  const supabase = getSupabase();
  const { data: marketplace, error: marketplaceError } = await supabase.from('marketplaces').select('id').eq('slug', 'mercadolivre').maybeSingle();
  if (marketplaceError || !marketplace) throw new Error('Marketplace Mercado Livre não cadastrado no catálogo.');

  let synced = 0;
  let skipped = 0;
  for (const order of orders) {
    const status = order.status === 'paid' ? 'APPROVED' : 'CANCELLED';
    for (const orderItem of order.order_items || []) {
      const externalProductId = orderItem.item?.id;
      if (!externalProductId) continue;
      const { data: product } = await supabase.from('products').select('id').eq('marketplace_id', marketplace.id).eq('external_product_id', externalProductId).maybeSingle();
      if (!product) {
        skipped += 1;
        continue;
      }

      const orderExternalId = `${order.id}:${externalProductId}`;
      const saleValue = Number(orderItem.unit_price || 0) * Number(orderItem.quantity || 1);
      const { data: existing } = await supabase.from('conversions').select('id').eq('order_external_id', orderExternalId).maybeSingle();
      const conversion = { product_id: product.id, marketplace_id: marketplace.id, sale_value: saleValue, commission_value: 0, status };
      const conversionError = existing
        ? (await supabase.from('conversions').update(conversion).eq('id', existing.id)).error
        : (await supabase.from('conversions').insert({ id: crypto.randomUUID(), order_external_id: orderExternalId, ...conversion })).error;
      if (conversionError) throw new Error(conversionError.message);
      synced += 1;
    }
  }

  return { sellerId: profile.id, ordersFound: orders.length, itemsSynced: synced, itemsSkipped: skipped };
}