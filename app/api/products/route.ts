import { NextRequest, NextResponse } from 'next/server';
import { getProducts } from '@/services/productService';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const categorySlug = searchParams.get('category') || undefined;
    const search = searchParams.get('q') || undefined;
    const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined;
    const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined;
    const minRating = searchParams.get('minRating') ? Number(searchParams.get('minRating')) : undefined;
    const marketplaceSlug = searchParams.get('marketplace') || undefined;
    const isBestSeller = searchParams.get('isBestSeller') === 'true';
    const isTrending = searchParams.get('isTrending') === 'true';
    const sortBy = (searchParams.get('sortBy') as any) || 'relevance';
    const page = Number(searchParams.get('page') || '1');
    const limit = Number(searchParams.get('limit') || '12');

    const result = await getProducts({
      categorySlug,
      search,
      minPrice,
      maxPrice,
      minRating,
      marketplaceSlug,
      isBestSeller,
      isTrending,
      sortBy,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao buscar produtos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = getSupabase();
    const now = new Date().toISOString();

    const {
      name,
      slug,
      description,
      categoryId,
      marketplaceId,
      brand,
      imageUrl,
      images,
      videoUrl,
      price,
      oldPrice,
      discountPercentage,
      rating = 0,
      reviewCount = 0,
      commissionPercentage,
      externalProductId,
      originalUrl,
      affiliateUrl,
    } = body;

    const computedDiscount = discountPercentage || (oldPrice ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0);
    const computedCommissionVal = (price * commissionPercentage) / 100;
    const computedSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + crypto.randomUUID().slice(0, 8);
    const productId = crypto.randomUUID();

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        id: productId,
        name,
        slug: computedSlug,
        description,
        category_id: categoryId,
        marketplace_id: marketplaceId,
        brand: brand || null,
        image_url: imageUrl,
        images: JSON.stringify(images || [imageUrl]),
        video_url: videoUrl || null,
        price,
        old_price: oldPrice || null,
        discount_percentage: computedDiscount,
        rating,
        review_count: reviewCount,
        commission_percentage: commissionPercentage,
        commission_value: computedCommissionVal,
        external_product_id: externalProductId || productId,
        original_url: originalUrl,
        affiliate_url: affiliateUrl,
        status: 'ACTIVE',
        created_at: now,
        updated_at: now,
        last_synced_at: now,
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.from('product_metrics').insert({
      id: crypto.randomUUID(),
      product_id: product.id,
      updated_at: now,
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao cadastrar produto' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID do produto é obrigatório' }, { status: 400 });

    const supabase = getSupabase();
    await supabase.from('price_history').delete().eq('product_id', id);
    await supabase.from('product_metrics').delete().eq('product_id', id);
    await supabase.from('clicks').delete().eq('product_id', id);
    await supabase.from('conversions').delete().eq('product_id', id);
    await supabase.from('favorites').delete().eq('product_id', id);
    await supabase.from('affiliate_links').delete().eq('product_id', id);
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao excluir produto' }, { status: 500 });
  }
}
