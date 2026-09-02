import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const runtime = 'edge';

export async function GET() {
  try {
    const marketplaces = await prisma.marketplace.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(marketplaces);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao buscar marketplaces' }, { status: 500 });
  }
}
