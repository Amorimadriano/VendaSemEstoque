import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { COOKIE_NAME, SESSION_TTL_SECONDS, createAdminSession } from '@/lib/adminAuth';

export const runtime = 'edge';

export async function POST(request: Request) {
  const { email, password } = await request.json();
  if (!email || !password) return NextResponse.json({ error: 'E-mail e senha são obrigatórios' }, { status: 400 });

  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/admin_users?select=id,email,passwordHash,role,active&email=eq.${encodeURIComponent(email)}&limit=1`, {
    headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || '', Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}` },
  });
  const admins = await response.json() as Array<{ id: string; email: string; passwordHash: string; role: string; active: boolean }>;
  const admin = admins[0];
  if (!admin || !admin.active || !(await bcrypt.compare(password, admin.passwordHash))) {
    return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
  }

  const result = NextResponse.json({ ok: true });
  result.cookies.set(COOKIE_NAME, await createAdminSession({ id: admin.id, email: admin.email, role: admin.role }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
  return result;
}
