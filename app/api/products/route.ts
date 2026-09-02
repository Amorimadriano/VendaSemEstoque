import { NextRequest, NextResponse } from 'next/server';
import { getProducts } from '@/services/productService';
import prisma from '@/lib/prisma';
import { ProductStatus } from '@prisma/client';

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

    const product = await prisma.product.create({
      data: {
        name,
        slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
        description,
        categoryId,
        marketplaceId,
        brand,
        imageUrl,
        images: JSON.stringify(images || [imageUrl]),
        videoUrl,
        price,
        oldPrice,
        discountPercentage: computedDiscount,
        rating,
        reviewCount,
        commissionPercentage,
        commissionValue: computedCommissionVal,
        externalProductId,
        originalUrl,
        affiliateUrl,
        status: ProductStatus.ACTIVE,
      },
    });

    // Metric inicial
    await prisma.productMetric.create({
      data: {
        productId: product.id,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao cadastrar produto' }, { status: 500 });
  }
}
