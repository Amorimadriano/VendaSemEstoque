export const PRODUCT_FIELD_MAP: Record<string, string> = {
  name: 'name',
  description: 'description',
  categoryId: 'category_id',
  marketplaceId: 'marketplace_id',
  brand: 'brand',
  imageUrl: 'image_url',
  images: 'images',
  videoUrl: 'video_url',
  price: 'price',
  cost: 'cost',
  platformFees: 'platform_fees',
  shippingCost: 'shipping_cost',
  marketingCost: 'marketing_cost',
  otherCosts: 'other_costs',
  oldPrice: 'old_price',
  discountPercentage: 'discount_percentage',
  rating: 'rating',
  reviewCount: 'review_count',
  commissionPercentage: 'commission_percentage',
  commissionValue: 'commission_value',
  externalProductId: 'external_product_id',
  originalUrl: 'original_url',
  affiliateUrl: 'affiliate_url',
  productType: 'product_type',
  supplierInfo: 'supplier_info',
  targetAudience: 'target_audience',
  keyBenefits: 'key_benefits',
  keyObjections: 'key_objections',
  competitionNotes: 'competition_notes',
  deliveryTime: 'delivery_time',
  returnPolicy: 'return_policy',
  status: 'status',
};

export function normalizeProductInput(input: Record<string, any> = {}) {
  const normalized: Record<string, any> = {};

  const assign = (key: string, value: any, transform?: (value: any) => any) => {
    const finalValue = transform ? transform(value) : value;
    if (finalValue === undefined) return;
    normalized[key] = finalValue;
  };

  const toOptionalNumber = (value: any) => {
    if (value === null || value === undefined || value === '') return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  };

  const toNullableString = (value: any) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed === '' ? null : trimmed;
    }
    return String(value);
  };

  for (const [key, value] of Object.entries(input)) {
    switch (key) {
      case 'name':
      case 'description':
      case 'brand':
      case 'externalProductId':
      case 'originalUrl':
      case 'affiliateUrl':
      case 'supplierInfo':
      case 'targetAudience':
      case 'keyBenefits':
      case 'keyObjections':
      case 'competitionNotes':
      case 'deliveryTime':
      case 'returnPolicy':
      case 'productType':
      case 'status':
      case 'marketplaceId':
      case 'categoryId':
      case 'imageUrl':
      case 'videoUrl':
        assign(key, value, toNullableString);
        break;
      case 'price':
      case 'cost':
      case 'platformFees':
      case 'shippingCost':
      case 'marketingCost':
      case 'otherCosts':
      case 'oldPrice':
      case 'commissionPercentage':
        assign(key, value, toOptionalNumber);
        break;
      default:
        assign(key, value, (raw) => (raw === '' ? null : raw));
    }
  }

  return normalized;
}
