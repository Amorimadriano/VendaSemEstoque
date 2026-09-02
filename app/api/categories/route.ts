import { NextResponse } from 'next/server';
import { getCategories } from '@/services/productService';

export const runtime = 'edge';

export async function GET() {
  try {
    const categories = await getCategories();
    return NextResponse.json(categories);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao buscar categorias' }, { status: 500 });
  }
}
