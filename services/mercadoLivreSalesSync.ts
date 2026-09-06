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

async function refreshAccessToken() {
  const refreshToken = process.env.MERCADOLIVRE_REFRESH_TOKEN;
  const clientId = process.env.MERCADOLIVRE_CLIENT_ID;
  const clientSecret = process.env.MERCADOLIVRE_CLIENT_SECRET;
  if (!refreshToken || !clientId || !clientSecret) throw new Error('OAuth Mercado Livre não configurado para renovar o token.');

  const response = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ grant_type: 'refresh_token', client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken }),
  });
  if (!response.ok) throw new Error(`Mercado Livre OAuth token refresh retornou ${response.status}.`);
  const data = await response.json() as { access_token?: string; refresh_token?: string };
  if (!data.access_token) throw new Error('Mercado Livre não retornou access token renovado.');
  process.env.MERCADOLIVRE_ACCESS_TOKEN = data.access_token;
  if (data.refresh_token) process.env.MERCADOLIVRE_REFRESH_TOKEN = data.refresh_token;
  return data.access_token;
}

async function requestWithToken(url: string) {
  let accessToken = process.env.MERCADOLIVRE_ACCESS_TOKEN;
  if (!accessToken) accessToken = await refreshAccessToken();
  let response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } });
  if (response.status === 401 && process.env.MERCADOLIVRE_REFRESH_TOKEN) {
    accessToken = await refreshAccessToken();
    response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } });
  }
  return response;
}

export async function syncMercadoLivreSales(limit = 50) {
  const profileResponse = await requestWithToken('https://api.mercadolibre.com/users/me');
  if (!profileResponse.ok) throw new Error(`Mercado Livre users/me retornou ${profileResponse.status}. Renove o OAuth token.`);
  const profile = await profileResponse.json() as { id?: number };
  if (!profile.id) throw new Error('Mercado Livre não retornou o identificador do vendedor.');

  const ordersUrl = new URL('https://api.mercadolibre.com/orders/search');
  ordersUrl.searchParams.set('seller', String(profile.id));
  ordersUrl.searchParams.set('sort', 'date_desc');
  ordersUrl.searchParams.set('limit', String(Math.min(limit, 50)));
  const ordersResponse = await requestWithToken(ordersUrl.toString());
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