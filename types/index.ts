export interface ExternalProduct {
  externalProductId: string;
  name: string;
  description: string;
  categoryName: string;
  brand?: string;
  imageUrl: string;
  images: string[];
  videoUrl?: string;
  price: number;
  oldPrice?: number;
  discountPercentage?: number;
  rating: number;
  reviewCount: number;
  commissionPercentage: number;
  commissionValue: number;
  originalUrl: string;
  affiliateUrl: string;
  isAvailable: boolean;
}

export interface AffiliateClickData {
  productId: string;
  marketplaceId?: string;
  affiliateLinkId?: string;
  sessionId?: string;
  userId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  device?: string;
  ipHash?: string;
}

export interface ScoreWeights {
  salesWeight: number;
  ratingWeight: number;
  reviewWeight: number;
  popularityWeight: number;
  conversionWeight: number;
  recentTrendWeight: number;
  commissionWeight: number;
}

export interface ProductQueryParams {
  categorySlug?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  marketplaceSlug?: string;
  isBestSeller?: boolean;
  isTrending?: boolean;
  sortBy?: 'relevance' | 'popularity' | 'price_asc' | 'price_desc' | 'discount' | 'rating' | 'commission';
  page?: number;
  limit?: number;
}
