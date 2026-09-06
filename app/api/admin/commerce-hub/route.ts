import { NextResponse } from 'next/server';
import { getCommerceHubStatus } from '@/services/commerceHub';

export const runtime = 'edge';

export async function GET() {
  return NextResponse.json({ connectors: getCommerceHubStatus() });
}