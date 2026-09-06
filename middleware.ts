import { NextResponse } from 'next/server';

export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/api/admin/:path*', '/api/products'],
};
