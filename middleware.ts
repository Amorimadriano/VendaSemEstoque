import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, verifyAdminSession } from './lib/adminAuth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/admin/login' || pathname === '/api/admin/login' || pathname === '/api/admin/logout') {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/admin/automation/')) {
    return NextResponse.next();
  }

  if (pathname === '/api/products' && request.method === 'GET') {
    return NextResponse.next();
  }

  const session = await verifyAdminSession(request.cookies.get(COOKIE_NAME)?.value);
  if (session) return NextResponse.next();

  if (pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/api/products'],
};
