import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getSupabase } from '@/lib/supabase';
import { Partner, PartnerError, PARTNER_TERMS_VERSION } from '@/lib/partner';
import { assertPartnerOrigin, createPartnerSession, limitPartnerRequests, PARTNER_COOKIE, PARTNER_SESSION_SECONDS, partnerApiError, partnerFields, readPartnerJson } from '@/lib/partnerAuth';

export const runtime = 'edge';
const credentials = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(12).max(72).refine((value) => new TextEncoder().encode(value).length <= 72, 'Senha deve ter até 72 bytes'),
});
const registration = credentials.extend({
  store_name: z.string().trim().min(3).max(100),
  legal_name: z.string().trim().min(5).max(150),
  document: z.string().regex(/^(?:\d{11}|\d{14})$/, 'Informe CPF ou CNPJ, somente números'),
  phone: z.string().regex(/^[+\d ()-]{10,25}$/),
  business_address: z.string().trim().min(15).max(300),
  accepted_terms: z.literal(true),
});

export async function POST(request: NextRequest) {
  try {
    assertPartnerOrigin(request);
    const body = z.object({ action: z.enum(['register', 'login', 'logout']) }).passthrough().parse(await readPartnerJson(request));
    if (body.action === 'logout') {
      const response = NextResponse.json({ ok: true });
      response.cookies.set(PARTNER_COOKIE, '', { path: '/', httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 0 });
      return response;
    }
    const input = credentials.parse(body);
    await limitPartnerRequests(request, 'auth-ip', 30);
    await limitPartnerRequests(request, 'auth-email', 8, input.email);
    const db = getSupabase();
    let partner: Partner;
    if (body.action === 'register') {
      const data = registration.parse(body);
      const { data: created, error } = await db.from('partners').insert({
        // bcrypt's async scheduler uses Node timers unavailable in Next's Edge runtime.
        email: data.email, password_hash: bcrypt.hashSync(data.password, 12), store_name: data.store_name,
        legal_name: data.legal_name, document: data.document, phone: data.phone, business_address: data.business_address,
        terms_version: PARTNER_TERMS_VERSION,
      }).select(partnerFields).single<Partner>();
      if (error) {
        if (error.code === '23505') throw new PartnerError('Não foi possível cadastrar este e-mail. Entre na conta existente ou procure a administração.', 409);
        throw error;
      }
      partner = created;
    } else {
      const { data, error } = await db.from('partners').select(`${partnerFields},password_hash`).eq('email', input.email)
        .maybeSingle<Partner & { password_hash: string }>();
      if (error) throw error;
      // Run a password comparison even for absent users to reduce account enumeration by timing.
      const valid = bcrypt.compareSync(input.password, data?.password_hash || '$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW');
      if (!data || !valid) throw new PartnerError('E-mail ou senha inválidos.', 401);
      partner = data;
    }
    const response = NextResponse.json({ ok: true });
    response.cookies.set(PARTNER_COOKIE, await createPartnerSession(partner.id), {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: PARTNER_SESSION_SECONDS,
    });
    return response;
  } catch (error) { return partnerApiError(error); }
}
