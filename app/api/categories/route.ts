import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const runtime = 'edge';

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(categories);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao buscar categorias' }, { status: 500 });
  }
}
