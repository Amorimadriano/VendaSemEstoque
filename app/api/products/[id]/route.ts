import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { normalizeProductInput, PRODUCT_FIELD_MAP } from '@/lib/productUpdate';

export const runtime = 'edge';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = getSupabase();
    const normalized = normalizeProductInput(body);

    const mappedPayload: Record<string, any> = {};

    for (const [key, value] of Object.entries(normalized)) {
      if (value === undefined || value === null && !['name', 'description', 'price', 'commissionPercentage', 'marketplaceId', 'categoryId'].includes(key)) {
        continue;
      }

      const mappedKey = PRODUCT_FIELD_MAP[key] || key;
      mappedPayload[mappedKey] = value;
    }

    const price = normalized.price ?? null;
    const commissionPercentage = normalized.commissionPercentage ?? null;
    const oldPrice = normalized.oldPrice ?? null;

    if (price !== null && commissionPercentage !== null) {
      mappedPayload.commission_value = Number(price) * (Number(commissionPercentage) / 100);
    }

    if (price !== null && oldPrice !== null && Number(oldPrice) > 0) {
      mappedPayload.discount_percentage = Math.round(((Number(oldPrice) - Number(price)) / Number(oldPrice)) * 100);
    }

    mappedPayload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('products')
      .update(mappedPayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao atualizar produto' }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = getSupabase();

    const slug = request.nextUrl.searchParams.get('slug');

    if (slug) {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao buscar produto' }, { status: 500 });
  }
}
