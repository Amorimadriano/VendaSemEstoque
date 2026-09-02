import prisma from '@/lib/prisma';
import { ProductQueryParams } from '@/types';
import { calculateProductScore } from '@/lib/score';
import { Prisma } from '@prisma/client';
import {
  getMockProducts,
  getMockProductBySlug,
  MOCK_CATEGORIES,
  MOCK_MARKETPLACES,
} from './mockData';

export async function getProducts(params: ProductQueryParams) {
  try {
    const {
      categorySlug,
      search,
      minPrice,
      maxPrice,
      minRating,
      marketplaceSlug,
      isBestSeller,
      isTrending,
      sortBy = 'relevance',
      page = 1,
      limit = 12,
    } = params;

    const where: Prisma.ProductWhereInput = {
      status: 'ACTIVE',
    };

    if (categorySlug) {
      where.category = { slug: categorySlug };
    }

    if (marketplaceSlug) {
      where.marketplace = { slug: marketplaceSlug };
    }

    if (isBestSeller) {
      where.isBestSeller = true;
    }

    if (isTrending) {
      where.isTrending = true;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    if (minRating !== undefined) {
      where.rating = { gte: minRating };
    }

    if (search) {
      const searchFilter = { contains: search };
      where.OR = [
        { name: searchFilter },
        { description: searchFilter },
        { brand: searchFilter },
      ];
    }

    let orderBy: Prisma.ProductOrderByWithRelationInput[] = [];

    switch (sortBy) {
      case 'price_asc':
        orderBy = [{ price: 'asc' }];
        break;
      case 'price_desc':
        orderBy = [{ price: 'desc' }];
        break;
      case 'discount':
        orderBy = [{ discountPercentage: 'desc' }];
        break;
      case 'rating':
        orderBy = [{ rating: 'desc' }, { reviewCount: 'desc' }];
        break;
      case 'commission':
        orderBy = [{ commissionPercentage: 'desc' }];
        break;
      case 'popularity':
        orderBy = [{ popularityScore: 'desc' }];
        break;
      case 'relevance':
      default:
        orderBy = [{ popularityScore: 'desc' }, { trendScore: 'desc' }];
        break;
    }

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          category: true,
          marketplace: true,
          metrics: true,
        },
      }),
      prisma.product.count({ where }),
    ]);

    const enrichedProducts = products.map((prod) => {
      const calculatedScore = calculateProductScore({
        rating: prod.rating,
        reviewCount: prod.reviewCount,
        popularityScore: prod.popularityScore,
        trendScore: prod.trendScore,
        commissionPercentage: prod.commissionPercentage,
        salesCount: prod.metrics?.totalConversions || 0,
        conversionRate: prod.metrics?.conversionRate || 0,
      });

      return {
        ...prod,
        computedScore: calculatedScore,
      };
    });

    if (enrichedProducts.length === 0 && !search && !categorySlug) {
      return getMockProducts(params);
    }

    return {
      products: enrichedProducts,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  } catch (error) {
    console.warn('Prisma query failed, using mock products:', error);
    return getMockProducts(params);
  }
}

export async function getProductBySlug(slug: string) {
  try {
    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        marketplace: true,
        metrics: true,
        priceHistories: {
          orderBy: { recordedAt: 'asc' },
          take: 30,
        },
      },
    });

    if (!product) {
      return getMockProductBySlug(slug);
    }

    const similarProducts = await prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        id: { not: product.id },
        status: 'ACTIVE',
      },
      take: 4,
      include: {
        marketplace: true,
      },
    });

    return {
      product,
      similarProducts,
    };
  } catch (error) {
    console.warn('Prisma query failed, using mock product by slug:', error);
    return getMockProductBySlug(slug);
  }
}

export async function getCategories() {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    if (!categories || categories.length === 0) return MOCK_CATEGORIES;
    return categories;
  } catch (error) {
    console.warn('Prisma query failed, using mock categories:', error);
    return MOCK_CATEGORIES;
  }
}

export async function getMarketplaces() {
  try {
    const marketplaces = await prisma.marketplace.findMany({
      orderBy: { name: 'asc' },
    });
    if (!marketplaces || marketplaces.length === 0) return MOCK_MARKETPLACES;
    return marketplaces;
  } catch (error) {
    console.warn('Prisma query failed, using mock marketplaces:', error);
    return MOCK_MARKETPLACES;
  }
}
