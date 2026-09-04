import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, verifyAdminSession } from './lib/adminAuth';

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/api/admin/login' || request.nextUrl.pathname === '/api/admin/logout') {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname === '/api/products' && request.method === 'GET') {
    return NextResponse.next();
  }

  const session = await verifyAdminSession(request.cookies.get(COOKIE_NAME)?.value);
  if (session) return NextResponse.next();

  if (request.nextUrl.pathname === '/admin') {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
}

export const config = {
  matcher: ['/admin', '/api/admin/:path*', '/api/products'],
};
