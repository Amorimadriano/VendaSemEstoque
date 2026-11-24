import { z } from 'zod';
import { getSupabase } from '@/lib/supabase';
import { base64url, hashPartnerValue } from '@/lib/partnerAuth';
import { moneyToCents, PartnerError, PartnerOrder, publicSiteUrl, requirePartnerPayments, requirePartnerPaymentConfig } from '@/lib/partner';

const text = new TextEncoder();
const providerId = z.union([z.string().regex(/^\d+$/), z.number().int().safe().nonnegative()]).transform(String);
const tokenSchema = z.object({
  access_token: z.string().min(1), refresh_token: z.string().min(1), expires_in: z.number().int().positive(),
  user_id: providerId, live_mode: z.boolean(),
});
type PaymentAccount = { partner_id: string; provider_user_id: string; encrypted_credentials: string; expires_at: string; live_mode: boolean };
export const paymentSchema = z.object({
  id: providerId, external_reference: z.string().uuid(), collector_id: providerId, application_id: providerId,
  currency_id: z.literal('BRL'), live_mode: z.boolean(),
  status: z.enum(['pending','approved','authorized','in_process','in_mediation','rejected','cancelled','refunded','charged_back']),
  transaction_amount: z.union([z.number(), z.string()]),
  transaction_amount_refunded: z.union([z.number(), z.string()]).default(0),
  date_last_updated: z.string().datetime({ offset: true }),
  fee_details: z.array(z.object({ type: z.string(), amount: z.union([z.number(), z.string()]) })).default([]),
});

async function encryptionKey() {
  const raw = process.env.PARTNER_TOKEN_ENCRYPTION_KEY;
  if (!raw || !/^[A-Za-z0-9+/=_-]+$/.test(raw)) throw new PartnerError('Chave de criptografia de pagamentos não configurada.', 503);
  const bytes = Uint8Array.from(atob(raw.replace(/-/g, '+').replace(/_/g, '/')), (value) => value.charCodeAt(0));
  if (bytes.length !== 32) throw new PartnerError('PARTNER_TOKEN_ENCRYPTION_KEY deve conter 32 bytes em base64.', 503);
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function encryptPartnerTokens(value: { access_token: string; refresh_token: string }) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await encryptionKey(), text.encode(JSON.stringify(value)));
  return `${base64url(iv)}.${base64url(new Uint8Array(data))}`;
}
export async function decryptPartnerTokens(value: string) {
  const parts = value.split('.');
  if (parts.length !== 2) throw new PartnerError('Credenciais de pagamento inválidas. Reconecte a conta.', 503);
  const decode = (part: string) => Uint8Array.from(atob(part.replace(/-/g, '+').replace(/_/g, '/')), (character) => character.charCodeAt(0));
  const data = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decode(parts[0]) }, await encryptionKey(), decode(parts[1]));
  return z.object({ access_token: z.string(), refresh_token: z.string() }).parse(JSON.parse(new TextDecoder().decode(data)));
}

async function mpRequest(path: string, accessToken?: string, init: RequestInit = {}): Promise<unknown> {
  const response = await fetch(`https://api.mercadopago.com${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...init.headers },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new PartnerError(`Mercado Pago indisponível (HTTP ${response.status}). Tente novamente ou reconecte a conta.`, 502);
  return response.json();
}

async function storeTokens(partnerId: string, payload: unknown) {
  const tokens = tokenSchema.parse(payload);
  const config = requirePartnerPaymentConfig();
  if (tokens.live_mode !== (config.mode === 'production')) throw new PartnerError('A conta Mercado Pago não corresponde ao modo de operação configurado.', 400);
  const { error } = await getSupabase().rpc('save_partner_payment_account', {
    p_partner_id: partnerId, p_provider_user_id: tokens.user_id,
    p_encrypted_credentials: await encryptPartnerTokens(tokens),
    p_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(), p_live_mode: tokens.live_mode,
  });
  if (error) throw error;
  return tokens;
}

export async function partnerAccessToken(partnerId: string) {
  const { data: account, error } = await getSupabase().from('partner_payment_accounts').select('*').eq('partner_id', partnerId).single<PaymentAccount>();
  if (error) {
    if (error.code === 'PGRST116') throw new PartnerError('O vendedor ainda não conectou o Mercado Pago.', 409);
    throw error;
  }
  const config = requirePartnerPaymentConfig();
  if (account.live_mode !== (config.mode === 'production')) throw new PartnerError('O vendedor deve reconectar a conta no modo de pagamento atual.', 409);
  const tokens = await decryptPartnerTokens(account.encrypted_credentials);
  if (new Date(account.expires_at).getTime() > Date.now() + 60000) return { token: tokens.access_token, collectorId: account.provider_user_id };
  const refreshed = await storeTokens(partnerId, await mpRequest('/oauth/token', undefined, {
    method: 'POST',
    body: JSON.stringify({ client_id: process.env.MERCADOPAGO_CLIENT_ID, client_secret: process.env.MERCADOPAGO_CLIENT_SECRET,
      grant_type: 'refresh_token', refresh_token: tokens.refresh_token }),
  }));
  return { token: refreshed.access_token, collectorId: refreshed.user_id };
}

export async function createPartnerOAuth(partnerId: string) {
  requirePartnerPayments();
  const state = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const { error } = await getSupabase().from('partner_oauth_states').insert({
    state_hash: await hashPartnerValue(state), partner_id: partnerId, verifier,
  });
  if (error) throw error;
  const url = new URL('https://auth.mercadopago.com/authorization');
  url.search = new URLSearchParams({
    client_id: process.env.MERCADOPAGO_CLIENT_ID || '', response_type: 'code', platform_id: 'mp',
    redirect_uri: `${publicSiteUrl()}/api/parceiros/mercadopago`, state,
    code_challenge: await hashPartnerValue(verifier), code_challenge_method: 'S256',
  }).toString();
  return url.toString();
}

export async function finishPartnerOAuth(partnerId: string, state: string, code: string) {
  requirePartnerPayments();
  const { data, error } = await getSupabase().from('partner_oauth_states').delete()
    .eq('state_hash', await hashPartnerValue(state)).eq('partner_id', partnerId)
    .gt('expires_at', new Date().toISOString()).select('verifier').maybeSingle<{ verifier: string }>();
  if (error) throw error;
  if (!data) throw new PartnerError('Autorização expirada ou já utilizada. Inicie novamente.', 400);
  await storeTokens(partnerId, await mpRequest('/oauth/token', undefined, {
    method: 'POST',
    body: JSON.stringify({ client_id: process.env.MERCADOPAGO_CLIENT_ID, client_secret: process.env.MERCADOPAGO_CLIENT_SECRET,
      grant_type: 'authorization_code', code, code_verifier: data.verifier, redirect_uri: `${publicSiteUrl()}/api/parceiros/mercadopago` }),
  }));
}

export function partnerPreference(order: PartnerOrder) {
  const site = publicSiteUrl();
  const receipt = `${site}/parceiros/compra?pedido=${order.id}&token=${order.receipt_token}`;
  return {
    items: [{ id: order.product_id, title: order.product_name, currency_id: 'BRL', quantity: 1, unit_price: order.total_cents / 100 }],
    payer: { email: order.buyer.email, name: order.buyer.name },
    marketplace_fee: order.commission_cents / 100,
    external_reference: order.id,
    notification_url: `${site}/api/webhooks/mercadopago?partner_id=${order.partner_id}&source_news=webhooks`,
    back_urls: { success: receipt, pending: receipt, failure: receipt },
    auto_return: 'approved',
    expires: true, expiration_date_from: order.created_at, expiration_date_to: order.expires_at,
    shipments: { mode: 'not_specified' },
    binary_mode: true,
    payment_methods: { excluded_payment_types: [{ id: 'ticket' }, { id: 'bank_transfer' }, { id: 'atm' }] },
    statement_descriptor: 'VENDASEMESTOQUE',
  };
}

export async function createPartnerCheckout(order: PartnerOrder) {
  const config = requirePartnerPayments();
  const { token } = await partnerAccessToken(order.partner_id);
  const preference = z.object({ id: z.string(), init_point: z.string().url(), sandbox_init_point: z.string().url() })
    .parse(await mpRequest('/checkout/preferences', token, { method: 'POST',
      headers: { 'X-Idempotency-Key': order.id }, body: JSON.stringify(partnerPreference(order)) }));
  const checkoutUrl = config.mode === 'production' ? preference.init_point : preference.sandbox_init_point;
  const url = new URL(checkoutUrl);
  if (url.protocol !== 'https:' || !['www.mercadopago.com.br', 'sandbox.mercadopago.com.br'].includes(url.hostname)) throw new PartnerError('Mercado Pago retornou endereço de checkout inesperado.', 502);
  const { error } = await getSupabase().from('partner_orders').update({ preference_id: preference.id, checkout_url: checkoutUrl })
    .eq('id', order.id);
  if (error) throw error;
  return checkoutUrl;
}

export async function verifyMercadoPagoSignature(request: Request, paymentId: string) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) throw new PartnerError('Webhook de pagamentos não configurado.', 503);
  const requestId = request.headers.get('x-request-id') || '';
  const signature = request.headers.get('x-signature') || '';
  if (!/^\d{1,40}$/.test(paymentId) || !/^[\w.-]{1,200}$/.test(requestId)) return false;
  const parts = new Map(signature.split(',').map((part) => {
    const [name, value] = part.trim().split('=');
    return [name, value] as const;
  }));
  const timestamp = parts.get('ts');
  const hexSignature = parts.get('v1');
  if (!timestamp || !hexSignature || !/^\d{1,20}$/.test(timestamp) || !/^[a-f0-9]{64}$/i.test(hexSignature)) return false;
  const key = await crypto.subtle.importKey('raw', text.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const digest = new Uint8Array((hexSignature.match(/.{2}/g) || []).map((hex) => parseInt(hex, 16)));
  return crypto.subtle.verify('HMAC', key, digest, text.encode(`id:${paymentId};request-id:${requestId};ts:${timestamp};`));
}

export function validatePartnerPayment(payment: z.infer<typeof paymentSchema>, order: PartnerOrder, collectorId: string) {
  const config = requirePartnerPaymentConfig();
  if (payment.external_reference !== order.id || payment.collector_id !== collectorId || payment.application_id !== process.env.MERCADOPAGO_CLIENT_ID ||
    payment.live_mode !== (config.mode === 'production') || moneyToCents(payment.transaction_amount) !== order.total_cents) {
    throw new PartnerError('Pagamento não corresponde ao vendedor, valor, ambiente ou pedido.', 409);
  }
  const refunded = moneyToCents(payment.transaction_amount_refunded);
  if (refunded > order.total_cents) throw new PartnerError('Estorno superior ao valor do pedido.', 409);
  if (payment.status === 'refunded' && refunded !== order.total_cents) throw new PartnerError('Estorno total ainda não confirmado pelo provedor.', 409);
  if (payment.status === 'approved') {
    const fee = payment.fee_details.filter((item) => item.type === 'application_fee' || item.type === 'marketplace_fee')
      .reduce((sum, item) => sum + moneyToCents(item.amount), 0);
    if (fee !== order.commission_cents) throw new PartnerError('Comissão não confirmada pelo provedor. Revisão necessária.', 409);
  }
  return { refunded };
}

export async function syncPartnerPayment(partnerId: string, paymentId: string) {
  const { token, collectorId } = await partnerAccessToken(partnerId);
  const payment = paymentSchema.parse(await mpRequest(`/v1/payments/${encodeURIComponent(paymentId)}`, token));
  if (payment.id !== paymentId) throw new PartnerError('ID de pagamento divergente.', 409);
  const { data: order, error } = await getSupabase().from('partner_orders').select('*')
    .eq('id', payment.external_reference).eq('partner_id', partnerId).single<PartnerOrder>();
  if (error) throw error;
  const { refunded } = validatePartnerPayment(payment, order, collectorId);
  const { error: rpcError } = await getSupabase().rpc('apply_partner_payment', {
    p_order_id: order.id, p_payment_id: payment.id, p_status: payment.status,
    p_amount: moneyToCents(payment.transaction_amount), p_refunded: refunded, p_source_updated_at: payment.date_last_updated,
  });
  if (rpcError) throw rpcError;
}

export async function reconcilePartnerOrder(order: PartnerOrder) {
  const { error: checkError } = await getSupabase().from('partner_orders').update({ last_payment_check_at: new Date().toISOString() }).eq('id', order.id);
  if (checkError) throw checkError;
  const { token } = await partnerAccessToken(order.partner_id);
  const search = z.object({ results: z.array(z.object({ id: providerId })), paging: z.object({ total: z.number() }) })
    .parse(await mpRequest(`/v1/payments/search?external_reference=${encodeURIComponent(order.id)}&limit=100`, token));
  if (search.paging.total > 100) throw new PartnerError('Pedido com muitos pagamentos. Revisão manual necessária.', 409);
  for (const payment of search.results) await syncPartnerPayment(order.partner_id, payment.id);
  if (new Date(order.expires_at).getTime() < Date.now()) {
    const { error } = await getSupabase().rpc('expire_partner_order', { p_id: order.id });
    if (error) throw error;
  }
}
