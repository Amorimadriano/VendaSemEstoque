import { NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/lib/adminAuth';

export const runtime = 'edge';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, '', { httpOnly: true, expires: new Date(0), path: '/' });
  return response;
}
