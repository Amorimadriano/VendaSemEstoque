import { ProductQueryParams } from '@/types';

export const MOCK_CATEGORIES = [
  { id: 'cat-eletronicos', name: 'Eletrônicos', slug: 'eletronicos', description: 'Smartphones, TVs e Gadgets', icon: 'Smartphone', _count: { products: 2 } },
  { id: 'cat-audio', name: 'Áudio & Som', slug: 'audio', description: 'Fones de ouvido, caixas de som e soundbars', icon: 'Headphones', _count: { products: 1 } },
  { id: 'cat-eletrodomesticos', name: 'Eletrodomésticos', slug: 'eletrodomesticos', description: 'Cafeteiras, robôs aspiradores e air fryers', icon: 'Coffee', _count: { products: 1 } },
  { id: 'cat-informatica', name: 'Informática', slug: 'informatica', description: 'Notebooks, monitores e periféricos', icon: 'Laptop', _count: { products: 1 } },
];

export const MOCK_MARKETPLACES = [
  { id: 'mkt-amazon', name: 'Amazon Brasil', slug: 'amazon', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg', apiStatus: 'ACTIVE', affiliateStatus: 'ACTIVE', _count: { products: 3, conversions: 12 } },
  { id: 'mkt-mercadolivre', name: 'Mercado Livre', slug: 'mercadolivre', logoUrl: 'https://http2.mlstatic.com/frontend-assets/ui-navigation/5.21.22/mercadolibre/logo__large_plus.png', apiStatus: 'ACTIVE', affiliateStatus: 'ACTIVE', _count: { products: 1, conversions: 8 } },
  { id: 'mkt-shopee', name: 'Shopee', slug: 'shopee', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/fe/Shopee.svg', apiStatus: 'ACTIVE', affiliateStatus: 'ACTIVE', _count: { products: 1, conversions: 5 } },
  { id: 'mkt-aliexpress', name: 'AliExpress', slug: 'aliexpress', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3b/AliExpress_logo.svg', apiStatus: 'ACTIVE', affiliateStatus: 'ACTIVE', _count: { products: 0, conversions: 2 } },
];

export const MOCK_PRODUCTS = [
  {
    id: 'prod-s24-ultra',
    name: 'Smartphone Galaxy S24 Ultra 512GB Titânio',
    slug: 'smartphone-galaxy-s24-ultra-512gb-titanio',
    description: 'Smartphone de última geração com câmera de 200MP, tela Dynamic AMOLED 2X de 6.8" e inteligência artificial Galaxy AI integrada.',
    categoryId: 'cat-eletronicos',
    marketplaceId: 'mkt-amazon',
    brand: 'Samsung',
    imageUrl: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=500&q=80',
    images: JSON.stringify(['https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=500&q=80']),
    price: 5999.00,
    oldPrice: 7499.00,
    discountPercentage: 20,
    rating: 4.9,
    reviewCount: 1420,
    popularityScore: 95.5,
    trendScore: 98.0,
    commissionPercentage: 8.0,
    commissionValue: 479.92,
    externalProductId: 'AMZ-S24U-512',
    originalUrl: 'https://amazon.com.br/dp/B0CS9MOCK1',
    affiliateUrl: 'https://amazon.com.br/dp/B0CS9MOCK1?tag=vendasemestoque-20',
    isBestSeller: true,
    isTrending: true,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    category: MOCK_CATEGORIES[0],
    marketplace: MOCK_MARKETPLACES[0],
    metrics: { id: 'm-1', productId: 'prod-s24-ultra', totalClicks: 180, totalConversions: 9, conversionRate: 0.05, ctr: 0.12, totalCommission: 1439.76 },
    priceHistories: [
      { id: 'ph-1', productId: 'prod-s24-ultra', price: 5999.00, oldPrice: 7499.00, recordedAt: new Date().toISOString() }
    ],
  },
  {
    id: 'prod-sony-xm5',
    name: 'Fone de Ouvido Bluetooth Noise Cancelling Sony WH-1000XM5',
    slug: 'fone-sony-wh-1000xm5-bluetooth-cancelamento-ruido',
    description: 'Cancelamento de ruído ativável líder de mercado, chamadas ultra cristalinas e bateria de longa duração até 30 horas.',
    categoryId: 'cat-audio',
    marketplaceId: 'mkt-mercadolivre',
    brand: 'Sony',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80',
    images: JSON.stringify(['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80']),
    price: 1899.90,
    oldPrice: 2499.00,
    discountPercentage: 24,
    rating: 4.8,
    reviewCount: 890,
    popularityScore: 89.0,
    trendScore: 92.5,
    commissionPercentage: 10.0,
    commissionValue: 189.99,
    externalProductId: 'MLB-SONY-XM5',
    originalUrl: 'https://mercadolivre.com.br/p/MLB-SONY-XM5',
    affiliateUrl: 'https://mercadolivre.com.br/p/MLB-SONY-XM5?matt_tool=12345678',
    isBestSeller: true,
    isTrending: false,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    category: MOCK_CATEGORIES[1],
    marketplace: MOCK_MARKETPLACES[1],
    metrics: { id: 'm-2', productId: 'prod-sony-xm5', totalClicks: 120, totalConversions: 6, conversionRate: 0.05, ctr: 0.10, totalCommission: 1139.94 },
    priceHistories: [
      { id: 'ph-2', productId: 'prod-sony-xm5', price: 1899.90, oldPrice: 2499.00, recordedAt: new Date().toISOString() }
    ],
  },
  {
    id: 'prod-lg-c3',
    name: 'Smart TV 55" 4K OLED LG C3 120Hz Dolby Vision',
    slug: 'smart-tv-55-4k-oled-lg-c3-120hz',
    description: 'Pixels que se acendem individualmente para preto puro, processador α9 Gen6 AI e suporte completo a G-Sync e FreeSync.',
    categoryId: 'cat-eletronicos',
    marketplaceId: 'mkt-shopee',
    brand: 'LG',
    imageUrl: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=500&q=80',
    images: JSON.stringify(['https://images.unsplash.com/photo-1593784991095-a205069470b6?w=500&q=80']),
    price: 4999.00,
    oldPrice: 6299.00,
    discountPercentage: 21,
    rating: 4.9,
    reviewCount: 610,
    popularityScore: 91.0,
    trendScore: 94.0,
    commissionPercentage: 12.0,
    commissionValue: 599.88,
    externalProductId: 'SHOPEE-LG-C3-55',
    originalUrl: 'https://shopee.com.br/product/123/45678',
    affiliateUrl: 'https://shopee.com.br/product/123/45678?smtt=vendasemestoque',
    isBestSeller: false,
    isTrending: true,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    category: MOCK_CATEGORIES[0],
    marketplace: MOCK_MARKETPLACES[2],
    metrics: { id: 'm-3', productId: 'prod-lg-c3', totalClicks: 95, totalConversions: 4, conversionRate: 0.04, ctr: 0.08, totalCommission: 2399.52 },
    priceHistories: [
      { id: 'ph-3', productId: 'prod-lg-c3', price: 4999.00, oldPrice: 6299.00, recordedAt: new Date().toISOString() }
    ],
  },
  {
    id: 'prod-nespresso-mini',
    name: 'Cafeteira Espresso Nespresso Essenza Mini',
    slug: 'cafeteira-espresso-nespresso-essenza-mini',
    description: 'Design compacto, 19 bar de pressão, aquecimento em 25 segundos e modo de economia de energia automático.',
    categoryId: 'cat-eletrodomesticos',
    marketplaceId: 'mkt-amazon',
    brand: 'Nespresso',
    imageUrl: 'https://images.unsplash.com/photo-1517668808822-9ed02810a0e9?w=500&q=80',
    images: JSON.stringify(['https://images.unsplash.com/photo-1517668808822-9ed02810a0e9?w=500&q=80']),
    price: 399.90,
    oldPrice: 549.90,
    discountPercentage: 27,
    rating: 4.7,
    reviewCount: 2300,
    popularityScore: 97.0,
    trendScore: 88.0,
    commissionPercentage: 8.5,
    commissionValue: 33.99,
    externalProductId: 'AMZ-NESPRESSO-MINI',
    originalUrl: 'https://amazon.com.br/dp/B07MOCK22',
    affiliateUrl: 'https://amazon.com.br/dp/B07MOCK22?tag=vendasemestoque-20',
    isBestSeller: true,
    isTrending: false,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    category: MOCK_CATEGORIES[2],
    marketplace: MOCK_MARKETPLACES[0],
    metrics: { id: 'm-4', productId: 'prod-nespresso-mini', totalClicks: 210, totalConversions: 14, conversionRate: 0.06, ctr: 0.15, totalCommission: 475.86 },
    priceHistories: [
      { id: 'ph-4', productId: 'prod-nespresso-mini', price: 399.90, oldPrice: 549.90, recordedAt: new Date().toISOString() }
    ],
  },
  {
    id: 'prod-dell-xps14',
    name: 'Notebook Dell XPS 14 Intel Core Ultra 7 32GB SSD 1TB',
    slug: 'notebook-dell-xps-14-intel-core-ultra-7-32gb-ssd-1tb',
    description: 'Corpo em alumínio usinado, tela OLED 3.2K Touch, processador Intel Core Ultra 7 com NPU para inteligência artificial.',
    categoryId: 'cat-informatica',
    marketplaceId: 'mkt-amazon',
    brand: 'Dell',
    imageUrl: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&q=80',
    images: JSON.stringify(['https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&q=80']),
    price: 11999.00,
    oldPrice: 13999.00,
    discountPercentage: 14,
    rating: 4.8,
    reviewCount: 310,
    popularityScore: 85.0,
    trendScore: 96.0,
    commissionPercentage: 8.5,
    commissionValue: 1019.91,
    externalProductId: 'AMZ-DELL-XPS14',
    originalUrl: 'https://amazon.com.br/dp/B09MOCKDELL',
    affiliateUrl: 'https://amazon.com.br/dp/B09MOCKDELL?tag=vendasemestoque-20',
    isBestSeller: false,
    isTrending: true,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    category: MOCK_CATEGORIES[3],
    marketplace: MOCK_MARKETPLACES[0],
    metrics: { id: 'm-5', productId: 'prod-dell-xps14', totalClicks: 140, totalConversions: 5, conversionRate: 0.03, ctr: 0.09, totalCommission: 5099.55 },
    priceHistories: [
      { id: 'ph-5', productId: 'prod-dell-xps14', price: 11999.00, oldPrice: 13999.00, recordedAt: new Date().toISOString() }
    ],
  },
];

export function getMockProducts(params: ProductQueryParams) {
  let filtered = [...MOCK_PRODUCTS];

  if (params.categorySlug) {
    filtered = filtered.filter((p) => p.category.slug === params.categorySlug);
  }
  if (params.marketplaceSlug) {
    filtered = filtered.filter((p) => p.marketplace.slug === params.marketplaceSlug);
  }
  if (params.isBestSeller) {
    filtered = filtered.filter((p) => p.isBestSeller);
  }
  if (params.isTrending) {
    filtered = filtered.filter((p) => p.isTrending);
  }
  if (params.minPrice !== undefined) {
    filtered = filtered.filter((p) => p.price >= params.minPrice!);
  }
  if (params.maxPrice !== undefined) {
    filtered = filtered.filter((p) => p.price <= params.maxPrice!);
  }
  if (params.search) {
    const term = params.search.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term) ||
        p.brand.toLowerCase().includes(term)
    );
  }

  // Sort
  switch (params.sortBy) {
    case 'price_asc':
      filtered.sort((a, b) => a.price - b.price);
      break;
    case 'price_desc':
      filtered.sort((a, b) => b.price - a.price);
      break;
    case 'discount':
      filtered.sort((a, b) => b.discountPercentage - a.discountPercentage);
      break;
    case 'rating':
      filtered.sort((a, b) => b.rating - a.rating);
      break;
    case 'commission':
      filtered.sort((a, b) => b.commissionPercentage - a.commissionPercentage);
      break;
    case 'popularity':
    case 'relevance':
    default:
      filtered.sort((a, b) => b.popularityScore - a.popularityScore);
      break;
  }

  const page = params.page || 1;
  const limit = params.limit || 12;
  const total = filtered.length;
  const skip = (page - 1) * limit;
  const paginated = filtered.slice(skip, skip + limit);

  return {
    products: paginated,
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export function getMockProductBySlug(slug: string) {
  const product = MOCK_PRODUCTS.find((p) => p.slug === slug || p.id === slug);
  if (!product) return null;

  const similarProducts = MOCK_PRODUCTS.filter(
    (p) => p.categoryId === product.categoryId && p.id !== product.id
  ).slice(0, 4);

  return {
    product,
    similarProducts,
  };
}

export function getMockMetrics() {
  return {
    summary: {
      totalProducts: MOCK_PRODUCTS.length,
      activeProducts: MOCK_PRODUCTS.length,
      trendingProducts: MOCK_PRODUCTS.filter((p) => p.isTrending).length,
      bestSellerProducts: MOCK_PRODUCTS.filter((p) => p.isBestSeller).length,
      totalClicks: 745,
      totalConversions: 38,
      conversionRate: 5.1,
      totalSaleValue: 184590.00,
      commissions: {
        total: 10555.03,
        pending: 3200.00,
        approved: 4500.00,
        paid: 2855.03,
      },
    },
    topProducts: MOCK_PRODUCTS,
    marketplaces: MOCK_MARKETPLACES,
  };
}
