import prisma from '../lib/prisma';
import { getMarketplaceIntegration } from '../integrations';
import { ExternalProduct } from '../types';

const SEARCHES = (process.env.PRODUCT_SEARCHES || 'eletronicos,celular,fones,notebook,smart tv,casa').split(',').map((term) => term.trim()).filter(Boolean);
const MIN_RATING = Number(process.env.PRODUCT_MIN_RATING || 4);
const MIN_REVIEWS = Number(process.env.PRODUCT_MIN_REVIEWS || 20);
const DEFAULT_COMMISSION = Number(process.env.MERCADOLIVRE_COMMISSION_PERCENTAGE || 10);
const MIN_PRICE = Number(process.env.PRODUCT_MIN_PRICE || 30);
const MAX_PRICE = Number(process.env.PRODUCT_MAX_PRICE || 5000);
const MARKETPLACES = (process.env.MARKETPLACES_TO_SYNC || 'mercadolivre,aliexpress').split(',').map((marketplace) => marketplace.trim()).filter(Boolean);

function toSlug(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

function isWorthPublishing(product: ExternalProduct) {
  return product.isAvailable && product.price >= MIN_PRICE && product.price <= MAX_PRICE;
}

function optimizeTitle(product: ExternalProduct) {
  const title = product.name.replace(/\s+/g, ' ').trim();
  return title.length <= 120 ? title : `${title.slice(0, 117).trim()}...`;
}

function optimizeDescription(product: ExternalProduct) {
  const description = product.description.replace(/\s+/g, ' ').trim();
  return description.length >= 80 ? description : `${description || product.name}. Confira preço, disponibilidade e condições diretamente no Mercado Livre.`;
}

function calculateRanking(product: ExternalProduct, commissionPercentage: number) {
  const sales = Math.min(product.salesCount || 0, 10000) / 100;
  const discount = Math.min(product.discountPercentage || 0, 70);
  const margin = Math.min(commissionPercentage, 30) * 2;
  return Math.round((sales * 0.55 + discount * 0.25 + margin * 0.2) * 100) / 100;
}

async function upsertProduct(product: ExternalProduct, marketplaceSlug: string) {
  const marketplaceName = marketplaceSlug === 'aliexpress' ? 'AliExpress' : 'Mercado Livre';
  const marketplace = await prisma.marketplace.upsert({
    where: { slug: marketplaceSlug },
    update: {},
    create: { name: marketplaceName, slug: marketplaceSlug, affiliateStatus: 'ACTIVE', apiStatus: 'ACTIVE' },
  });

  const categorySlug = toSlug(product.categoryName || 'ofertas');
  const category = await prisma.category.upsert({
    where: { slug: categorySlug },
    update: {},
    create: { name: product.categoryName || 'Ofertas', slug: categorySlug },
  });

  const affiliateUrl = await getMarketplaceIntegration(marketplaceSlug).createAffiliateLink(product.originalUrl, product.externalProductId);
  const slug = `${toSlug(product.name)}-${product.externalProductId.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`.slice(0, 190);
  const commissionPercentage = product.commissionPercentage || DEFAULT_COMMISSION;
  const ranking = calculateRanking(product, commissionPercentage);
  const optimizedTitle = optimizeTitle(product);
  const optimizedDescription = optimizeDescription(product);

  const savedProduct = await prisma.product.upsert({
    where: { externalProductId: product.externalProductId },
    update: {
      name: optimizedTitle,
      description: optimizedDescription,
      imageUrl: product.imageUrl,
      images: JSON.stringify(product.images?.length ? product.images : [product.imageUrl]),
      price: product.price,
      oldPrice: product.oldPrice,
      discountPercentage: product.discountPercentage,
      rating: product.rating,
      reviewCount: product.reviewCount,
      salesCount: product.salesCount || 0,
      popularityScore: ranking,
      trendScore: product.salesCount && product.salesCount > 100 ? ranking : 0,
      commissionPercentage,
      commissionValue: product.price * commissionPercentage / 100,
      originalUrl: product.originalUrl,
      affiliateUrl,
      lastSyncedAt: new Date(),
      isBestSeller: (product.salesCount || 0) >= 1000,
      isTrending: ranking >= 35,
      status: 'ACTIVE',
    },
    create: {
      name: optimizedTitle,
      slug,
      description: optimizedDescription,
      categoryId: category.id,
      marketplaceId: marketplace.id,
      brand: product.brand,
      imageUrl: product.imageUrl,
      images: JSON.stringify(product.images?.length ? product.images : [product.imageUrl]),
      price: product.price,
      oldPrice: product.oldPrice,
      discountPercentage: product.discountPercentage,
      rating: product.rating,
      reviewCount: product.reviewCount,
      salesCount: product.salesCount || 0,
      popularityScore: ranking,
      trendScore: product.salesCount && product.salesCount > 100 ? ranking : 0,
      commissionPercentage,
      commissionValue: product.price * commissionPercentage / 100,
      externalProductId: product.externalProductId,
      originalUrl: product.originalUrl,
      affiliateUrl,
      isBestSeller: (product.salesCount || 0) >= 1000,
      isTrending: ranking >= 35,
      status: 'ACTIVE',
      metrics: { create: {} },
    },
  });

  await prisma.priceHistory.create({
    data: {
      productId: savedProduct.id,
      price: product.price,
      oldPrice: product.oldPrice,
    },
  });

  return savedProduct;
}

export async function runProductDiscovery() {
  if (MARKETPLACES.includes('mercadolivre') && !process.env.MERCADOLIVRE_ACCESS_TOKEN && !process.env.MERCADOLIVRE_REFRESH_TOKEN) {
    throw new Error('Mercado Livre OAuth não configurado: cadastre MERCADOLIVRE_ACCESS_TOKEN ou MERCADOLIVRE_REFRESH_TOKEN.');
  }
  if (MARKETPLACES.includes('aliexpress') && (!process.env.ALIEXPRESS_APP_KEY || !process.env.ALIEXPRESS_APP_SECRET || !process.env.ALIEXPRESS_TRACKING_ID)) {
    throw new Error('AliExpress não configurado: cadastre ALIEXPRESS_APP_KEY, ALIEXPRESS_APP_SECRET e ALIEXPRESS_TRACKING_ID.');
  }

  const discovered = new Map<string, ExternalProduct>();

  for (const marketplaceSlug of MARKETPLACES) {
    const integration = getMarketplaceIntegration(marketplaceSlug);
    for (const search of SEARCHES) {
      try {
        const products = await integration.getProducts(search, undefined, 20);
        for (const product of products) {
          if (isWorthPublishing(product)) discovered.set(`${marketplaceSlug}:${product.externalProductId}`, product);
        }
      } catch (error) {
        console.warn(`Search failed for ${marketplaceSlug}/${search}:`, error);
      }
    }
  }

  let published = 0;
  for (const [key, product] of discovered.entries()) {
    await upsertProduct(product, key.split(':')[0]);
    published += 1;
  }

  if (discovered.size === 0) {
    throw new Error(`Nenhum produto foi encontrado em ${MARKETPLACES.join(', ')}. Verifique as credenciais, a aprovação da conta de afiliado e os limites da API.`);
  }

  for (const marketplaceSlug of MARKETPLACES) {
    const integration = getMarketplaceIntegration(marketplaceSlug);
    const marketplace = await prisma.marketplace.findUnique({ where: { slug: marketplaceSlug } });
    if (!marketplace) continue;
    const existing = await prisma.product.findMany({
      where: { marketplaceId: marketplace.id, status: 'ACTIVE' },
      select: { id: true, externalProductId: true },
    });
    for (const product of existing) {
      if (!discovered.has(`${marketplaceSlug}:${product.externalProductId}`)) {
        const available = await integration.getAvailability(product.externalProductId);
        if (!available) {
          await prisma.product.update({ where: { id: product.id }, data: { status: 'OUT_OF_STOCK', lastSyncedAt: new Date() } });
        }
      }
    }
  }

  if (discovered.size === 0) {
    throw new Error('Nenhum produto foi encontrado nos marketplaces configurados. Verifique credenciais e APIs.');
  }

  return { marketplaces: MARKETPLACES, searched: SEARCHES.length, discovered: discovered.size, published, rankingUpdated: published };
}

if (require.main === module) {
  runProductDiscovery()
    .then((result) => console.log(JSON.stringify(result)))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
