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
      cost,
      platformFees,
      shippingCost,
      marketingCost,
      otherCosts,
      oldPrice,
      discountPercentage,
      rating = 0,
      reviewCount = 0,
      commissionPercentage,
      externalProductId,
      originalUrl,
      affiliateUrl,
      productType,
      supplierInfo,
      targetAudience,
      keyBenefits,
      keyObjections,
      competitionNotes,
      deliveryTime,
      returnPolicy,
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
        product_type: productType || null,
        brand: brand || null,
        image_url: imageUrl,
        images: JSON.stringify(images || [imageUrl]),
        video_url: videoUrl || null,
        price,
        cost: cost || null,
        platform_fees: platformFees || null,
        shipping_cost: shippingCost || null,
        marketing_cost: marketingCost || null,
        other_costs: otherCosts || null,
        old_price: oldPrice || null,
        discount_percentage: computedDiscount,
        rating,
        review_count: reviewCount,
        commission_percentage: commissionPercentage,
        commission_value: computedCommissionVal,
        external_product_id: externalProductId || productId,
        original_url: originalUrl,
        affiliate_url: affiliateUrl,
        supplier_info: supplierInfo || null,
        target_audience: targetAudience || null,
        key_benefits: keyBenefits || null,
        key_objections: keyObjections || null,
        competition_notes: competitionNotes || null,
        delivery_time: deliveryTime || null,
        return_policy: returnPolicy || null,
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
    let ids: string[] = [];

    const idParam = searchParams.get('id') || searchParams.get('ids');
    if (idParam) {
      ids = idParam.split(',').map((s) => s.trim()).filter(Boolean);
    } else {
      try {
        const body = await request.json();
        if (Array.isArray(body?.ids)) {
          ids = body.ids.map((s: any) => String(s).trim()).filter(Boolean);
        } else if (body?.id) {
          ids = [String(body.id).trim()];
        }
      } catch {}
    }

    if (!ids.length) {
      return NextResponse.json({ error: 'Nenhum ID de produto informado para exclusão.' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Exclui dependências vinculadas aos produtos selecionados
    await supabase.from('price_history').delete().in('product_id', ids);
    await supabase.from('product_metrics').delete().in('product_id', ids);
    await supabase.from('clicks').delete().in('product_id', ids);
    await supabase.from('conversions').delete().in('product_id', ids);
    await supabase.from('favorites').delete().in('product_id', ids);
    await supabase.from('affiliate_links').delete().in('product_id', ids);
    await supabase.from('marketing_content').delete().in('product_id', ids);
    await supabase.from('marketing_campaigns').delete().in('product_id', ids);
    await supabase.from('marketing_ab_tests').delete().in('product_id', ids);

    const { error } = await supabase.from('products').delete().in('id', ids);
    if (error) throw error;

    return NextResponse.json({ success: true, count: ids.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao excluir produtos' }, { status: 500 });
  }
}
