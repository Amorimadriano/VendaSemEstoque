import prisma from '../lib/prisma';
import { getMarketplaceIntegration } from '../integrations';
import { ExternalProduct } from '../types';

const SEARCHES = (process.env.PRODUCT_SEARCHES || 'eletronicos,celular,fones,notebook,smart tv,casa').split(',').map((term) => term.trim()).filter(Boolean);
const MIN_RATING = Number(process.env.PRODUCT_MIN_RATING || 4);
const MIN_REVIEWS = Number(process.env.PRODUCT_MIN_REVIEWS || 20);
const DEFAULT_COMMISSION = Number(process.env.MERCADOLIVRE_COMMISSION_PERCENTAGE || 10);

function toSlug(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

function isWorthPublishing(product: ExternalProduct) {
  return product.isAvailable && product.price > 0;
}

async function upsertProduct(product: ExternalProduct) {
  const marketplace = await prisma.marketplace.upsert({
    where: { slug: 'mercadolivre' },
    update: {},
    create: { name: 'Mercado Livre', slug: 'mercadolivre', affiliateStatus: 'ACTIVE', apiStatus: 'ACTIVE' },
  });

  const categorySlug = toSlug(product.categoryName || 'ofertas');
  const category = await prisma.category.upsert({
    where: { slug: categorySlug },
    update: {},
    create: { name: product.categoryName || 'Ofertas', slug: categorySlug },
  });

  const affiliateUrl = await getMarketplaceIntegration('mercadolivre').createAffiliateLink(product.originalUrl, product.externalProductId);
  const slug = `${toSlug(product.name)}-${product.externalProductId.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`.slice(0, 190);
  const commissionPercentage = product.commissionPercentage || DEFAULT_COMMISSION;

  return prisma.product.upsert({
    where: { externalProductId: product.externalProductId },
    update: {
      name: product.name,
      description: product.description || product.name,
      imageUrl: product.imageUrl,
      images: JSON.stringify(product.images?.length ? product.images : [product.imageUrl]),
      price: product.price,
      oldPrice: product.oldPrice,
      discountPercentage: product.discountPercentage,
      rating: product.rating,
      reviewCount: product.reviewCount,
      commissionPercentage,
      commissionValue: product.price * commissionPercentage / 100,
      originalUrl: product.originalUrl,
      affiliateUrl,
      lastSyncedAt: new Date(),
      status: 'ACTIVE',
    },
    create: {
      name: product.name,
      slug,
      description: product.description || product.name,
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
      popularityScore: product.reviewCount,
      trendScore: product.rating * 20,
      commissionPercentage,
      commissionValue: product.price * commissionPercentage / 100,
      externalProductId: product.externalProductId,
      originalUrl: product.originalUrl,
      affiliateUrl,
      isBestSeller: product.reviewCount >= 1000,
      isTrending: product.rating >= 4.7,
      status: 'ACTIVE',
      metrics: { create: {} },
    },
  });
}

export async function runProductDiscovery() {
  const integration = getMarketplaceIntegration('mercadolivre');
  const discovered = new Map<string, ExternalProduct>();

  for (const search of SEARCHES) {
    try {
      const products = await integration.getProducts(search, undefined, 20);
      for (const product of products) {
        if (isWorthPublishing(product)) discovered.set(product.externalProductId, product);
      }
    } catch (error) {
      console.warn(`Search failed for "${search}":`, error);
    }
  }

  let published = 0;
  for (const product of discovered.values()) {
    await upsertProduct(product);
    published += 1;
  }

  return { searched: SEARCHES.length, discovered: discovered.size, published };
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
