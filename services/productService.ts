import { ProductQueryParams } from '@/types';
import { calculateProductScore } from '@/lib/score';
import { supabase } from '@/lib/supabase';

function normalizeProduct(product: any) {
  return {
    ...product,
    imageUrl: product.image_url,
    oldPrice: product.old_price,
    discountPercentage: product.discount_percentage,
    reviewCount: product.review_count,
    salesCount: product.sales_count || 0,
    popularityScore: product.popularity_score,
    trendScore: product.trend_score,
    commissionPercentage: product.commission_percentage,
    commissionValue: product.commission_value,
    externalProductId: product.external_product_id,
    originalUrl: product.original_url,
    affiliateUrl: product.affiliate_url,
    isBestSeller: product.is_best_seller,
    isTrending: product.is_trending,
    priceHistories: (product.priceHistories || product.price_history || []).map((history: any) => ({
      ...history,
      oldPrice: history.old_price,
      recordedAt: history.recorded_at,
    })),
    metrics: Array.isArray(product.metrics) ? product.metrics[0] : product.metrics,
  };
}

export async function getProducts(params: ProductQueryParams) {
  let query = supabase.from('products').select('*, category:categories(*), marketplace:marketplaces(*), metrics:product_metrics(*)', { count: 'exact' }).eq('status', 'ACTIVE');
  if (params.categorySlug) query = query.eq('categories.slug', params.categorySlug);
  if (params.marketplaceSlug) query = query.eq('marketplaces.slug', params.marketplaceSlug);
  if (params.isBestSeller) query = query.eq('is_best_seller', true);
  if (params.isTrending) query = query.eq('is_trending', true);
  if (params.minPrice !== undefined) query = query.gte('price', params.minPrice);
  if (params.maxPrice !== undefined) query = query.lte('price', params.maxPrice);
  if (params.minRating !== undefined) query = query.gte('rating', params.minRating);
  if (params.search) query = query.or(`name.ilike.%${params.search}%,description.ilike.%${params.search}%,brand.ilike.%${params.search}%`);

  switch (params.sortBy) {
    case 'price_asc': query = query.order('price', { ascending: true }); break;
    case 'price_desc': query = query.order('price', { ascending: false }); break;
    case 'discount': query = query.order('discount_percentage', { ascending: false }); break;
    case 'rating': query = query.order('rating', { ascending: false }).order('review_count', { ascending: false }); break;
    case 'commission': query = query.order('commission_percentage', { ascending: false }); break;
    default: query = query.order('popularity_score', { ascending: false }).order('trend_score', { ascending: false }); break;
  }

  const page = params.page || 1;
  const limit = params.limit || 12;
  const { data, count, error } = await query.range((page - 1) * limit, page * limit - 1);
  if (error) throw error;
  const products = (data || []).map((product) => {
    const normalized = normalizeProduct(product);
    return { ...normalized, computedScore: calculateProductScore({
      rating: normalized.rating,
      reviewCount: normalized.reviewCount,
      popularityScore: normalized.popularityScore,
      trendScore: normalized.trendScore,
      commissionPercentage: normalized.commissionPercentage,
      salesCount: normalized.metrics?.total_conversions || normalized.salesCount,
      conversionRate: normalized.metrics?.conversion_rate || 0,
    }) };
  });
  return { products, total: count || 0, page, totalPages: Math.ceil((count || 0) / limit) || 1 };
}

export async function getProductBySlug(slug: string) {
  const { data: product, error } = await supabase.from('products').select('*, category:categories(*), marketplace:marketplaces(*), metrics:product_metrics(*), priceHistories:price_history(*)').eq('slug', slug).maybeSingle();
  if (error) throw error;
  if (!product) return null;
  const { data: similarProducts, error: similarError } = await supabase.from('products').select('*, marketplace:marketplaces(*)').eq('category_id', product.category_id).neq('id', product.id).eq('status', 'ACTIVE').limit(4);
  if (similarError) throw similarError;
  return { product: normalizeProduct(product), similarProducts: (similarProducts || []).map(normalizeProduct) };
}

export async function getCategories() {
  const { data, error } = await supabase.from('categories').select('*, products(count)').order('name');
  if (error) throw error;
  return (data || []).map((category: any) => ({ ...category, _count: { products: category.products?.[0]?.count || 0 } }));
}

export async function getMarketplaces() {
  const { data, error } = await supabase.from('marketplaces').select('*').order('name');
  if (error) throw error;
  return data || [];
}
