import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabase } from './supabase';
import { Partner, PartnerError } from './partner';

export const PARTNER_COOKIE = 'partner_session';
export const PARTNER_SESSION_SECONDS = 60 * 60 * 8;
const encoder = new TextEncoder();
export const partnerFields = 'id,email,store_name,legal_name,document,phone,business_address,status,review_note,accepted_commission_bps,terms_version';

export function base64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function decode64(value: string) {
  return Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), (character) => character.charCodeAt(0));
}
export async function hashPartnerValue(value: string) {
  return base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))));
}
async function sessionKey() {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32) throw new PartnerError('Autenticação não configurada.', 503);
  return crypto.subtle.importKey('raw', encoder.encode(`partner:${secret}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
export async function createPartnerSession(id: string) {
  const payload = base64url(encoder.encode(JSON.stringify({ id, scope: 'partner', exp: Math.floor(Date.now() / 1000) + PARTNER_SESSION_SECONDS })));
  return `${payload}.${base64url(new Uint8Array(await crypto.subtle.sign('HMAC', await sessionKey(), encoder.encode(payload))))}`;
}
export async function verifyPartnerSession(token?: string) {
  if (!token || token.length > 2000) return null;
  const parts = token.split('.');
  if (parts.length !== 2 || !parts.every((part) => /^[\w-]+$/.test(part))) return null;
  const key = await sessionKey();
  try {
    if (!await crypto.subtle.verify('HMAC', key, decode64(parts[1]), encoder.encode(parts[0]))) return null;
    const data = z.object({ id: z.string().uuid(), scope: z.literal('partner'), exp: z.number().int() }).safeParse(JSON.parse(new TextDecoder().decode(decode64(parts[0]))));
    return data.success && data.data.exp > Date.now() / 1000 ? data.data.id : null;
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof DOMException) return null;
    throw error;
  }
}
export async function requirePartner(request: NextRequest) {
  const id = await verifyPartnerSession(request.cookies.get(PARTNER_COOKIE)?.value);
  if (!id) throw new PartnerError('Entre na sua conta de parceiro.', 401);
  const { data, error } = await getSupabase().from('partners').select(partnerFields).eq('id', id).single<Partner>();
  if (error) {
    if (error.code === 'PGRST116') throw new PartnerError('Sessão inválida.', 401);
    throw error;
  }
  return data;
}
export function assertPartnerOrigin(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get('host') || url.host;
  const expected = `${url.protocol}//${host}`;
  if (request.headers.get('origin') !== expected) throw new PartnerError('Origem da solicitação não autorizada.', 403);
}
export async function limitPartnerRequests(request: Request, action: string, limit: number, identity = '') {
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const key = await hashPartnerValue(`${action}:${ip}:${identity.toLowerCase()}`);
  const { data, error } = await getSupabase().rpc('partner_rate_limit', { p_key: key, p_limit: limit });
  if (error) throw error;
  if (!data) throw new PartnerError('Muitas tentativas. Aguarde 15 minutos.', 429);
}
export function partnerApiError(error: unknown) {
  if (error instanceof PartnerError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ') }, { status: 400 });
  if (error instanceof SyntaxError) return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  const diagnostic = error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Erro inesperado';
  console.error('[PartnerMarketplace]', diagnostic);
  return NextResponse.json({ error: 'Não foi possível concluir a operação. Tente novamente ou contate a administração.' }, { status: 500 });
}
export async function readPartnerJson(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new PartnerError('Corpo da solicitação obrigatório.');
  const decoder = new TextDecoder();
  let length = 0;
  let body = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > 20000) { await reader.cancel(); throw new PartnerError('Solicitação muito grande.', 413); }
    body += decoder.decode(value, { stream: true });
  }
  return JSON.parse(body + decoder.decode());
}
