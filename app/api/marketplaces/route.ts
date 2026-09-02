import { NextResponse } from 'next/server';
import { getMarketplaces } from '@/services/productService';

export const runtime = 'edge';

export async function GET() {
  try {
    const marketplaces = await getMarketplaces();
    return NextResponse.json(marketplaces);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao buscar marketplaces' }, { status: 500 });
  }
}
