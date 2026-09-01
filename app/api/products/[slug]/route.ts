import { NextRequest, NextResponse } from 'next/server';
import { getProductBySlug } from '@/services/productService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const result = await getProductBySlug(slug);

    if (!result) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao buscar produto' }, { status: 500 });
  }
}
