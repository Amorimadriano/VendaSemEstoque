import { PrismaClient, Role, ProductStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // 1. Criar Usuário Admin
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.adminUser.upsert({
    where: { email: 'admin@vendasemestoque.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@vendasemestoque.com',
      passwordHash: adminPasswordHash,
      role: Role.SUPERADMIN,
      active: true,
    },
  });
  console.log('👤 Admin criado:', admin.email);

  // 2. Criar Marketplaces
  const amazon = await prisma.marketplace.upsert({
    where: { slug: 'amazon' },
    update: {},
    create: {
      name: 'Amazon Brasil',
      slug: 'amazon',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg',
      apiStatus: 'ACTIVE',
      affiliateStatus: 'ACTIVE',
    },
  });

  const mercadolivre = await prisma.marketplace.upsert({
    where: { slug: 'mercadolivre' },
    update: {},
    create: {
      name: 'Mercado Livre',
      slug: 'mercadolivre',
      logoUrl: 'https://http2.mlstatic.com/frontend-assets/ui-navigation/5.21.22/mercadolibre/logo__large_plus.png',
      apiStatus: 'ACTIVE',
      affiliateStatus: 'ACTIVE',
    },
  });

  const shopee = await prisma.marketplace.upsert({
    where: { slug: 'shopee' },
    update: {},
    create: {
      name: 'Shopee',
      slug: 'shopee',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/fe/Shopee.svg',
      apiStatus: 'ACTIVE',
      affiliateStatus: 'ACTIVE',
    },
  });

  const aliexpress = await prisma.marketplace.upsert({
    where: { slug: 'aliexpress' },
    update: {},
    create: {
      name: 'AliExpress',
      slug: 'aliexpress',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3b/AliExpress_logo.svg',
      apiStatus: 'ACTIVE',
      affiliateStatus: 'ACTIVE',
    },
  });

  console.log('🏪 Marketplaces criados.');

  // 3. Criar Programas de Afiliados
  await prisma.affiliateProgram.createMany({
    data: [
      { marketplaceId: amazon.id, name: 'Associados Amazon', commissionRate: 8.5, cookieDuration: 24 },
      { marketplaceId: mercadolivre.id, name: 'Afiliados Mercado Livre', commissionRate: 10.0, cookieDuration: 7 },
      { marketplaceId: shopee.id, name: 'Programa de Afiliados Shopee', commissionRate: 12.0, cookieDuration: 30 },
      { marketplaceId: aliexpress.id, name: 'AliExpress Portals', commissionRate: 9.0, cookieDuration: 30 },
    ],
  });

  // 4. Criar Categorias
  const catEletronicos = await prisma.category.upsert({
    where: { slug: 'eletronicos' },
    update: {},
    create: { name: 'Eletrônicos', slug: 'eletronicos', description: 'Smartphones, TVs e Gadgets', icon: 'Smartphone' },
  });

  const catAudio = await prisma.category.upsert({
    where: { slug: 'audio' },
    update: {},
    create: { name: 'Áudio & Som', slug: 'audio', description: 'Fones de ouvido, caixas de som e soundbars', icon: 'Headphones' },
  });

  const catEletro = await prisma.category.upsert({
    where: { slug: 'eletrodomesticos' },
    update: {},
    create: { name: 'Eletrodomésticos', slug: 'eletrodomesticos', description: 'Cafeteiras, robôs aspiradores e air fryers', icon: 'Coffee' },
  });

  const catInformatica = await prisma.category.upsert({
    where: { slug: 'informatica' },
    update: {},
    create: { name: 'Informática', slug: 'informatica', description: 'Notebooks, monitores e periféricos', icon: 'Laptop' },
  });

  console.log('📂 Categorias criadas.');

  // 5. Criar Produtos de Exemplo
  const sampleProducts = [
    {
      name: 'Smartphone Galaxy S24 Ultra 512GB Titânio',
      slug: 'smartphone-galaxy-s24-ultra-512gb-titanio',
      description: 'Smartphone de última geração com câmera de 200MP, tela Dynamic AMOLED 2X de 6.8" e inteligência artificial Galaxy AI integrada.',
      categoryId: catEletronicos.id,
      marketplaceId: amazon.id,
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
      status: ProductStatus.ACTIVE,
    },
    {
      name: 'Fone de Ouvido Bluetooth Noise Cancelling Sony WH-1000XM5',
      slug: 'fone-sony-wh-1000xm5-bluetooth-cancelamento-ruido',
      description: 'Cancelamento de ruído ativável líder de mercado, chamadas ultra cristalinas e bateria de longa duração até 30 horas.',
      categoryId: catAudio.id,
      marketplaceId: mercadolivre.id,
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
      status: ProductStatus.ACTIVE,
    },
    {
      name: 'Smart TV 55" 4K OLED LG C3 120Hz Dolby Vision',
      slug: 'smart-tv-55-4k-oled-lg-c3-120hz',
      description: 'Pixels que se acendem individualmente para preto puro, processador α9 Gen6 AI e suporte completo a G-Sync e FreeSync.',
      categoryId: catEletronicos.id,
      marketplaceId: shopee.id,
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
      status: ProductStatus.ACTIVE,
    },
    {
      name: 'Cafeteira Espresso Nespresso Essenza Mini',
      slug: 'cafeteira-espresso-nespresso-essenza-mini',
      description: 'Design compacto, 19 bar de pressão, aquecimento em 25 segundos e modo de economia de energia automático.',
      categoryId: catEletro.id,
      marketplaceId: amazon.id,
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
      status: ProductStatus.ACTIVE,
    },
    {
      name: 'Notebook Dell XPS 14 Intel Core Ultra 7 32GB SSD 1TB',
      slug: 'notebook-dell-xps-14-intel-core-ultra-7-32gb-ssd-1tb',
      description: 'Corpo em alumínio usinado, tela OLED 3.2K Touch, processador Intel Core Ultra 7 com NPU para inteligência artificial.',
      categoryId: catInformatica.id,
      marketplaceId: amazon.id,
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
      status: ProductStatus.ACTIVE,
    },
  ];

  for (const prodData of sampleProducts) {
    const prod = await prisma.product.upsert({
      where: { slug: prodData.slug },
      update: {},
      create: prodData,
    });

    // Metric inicial
    await prisma.productMetric.upsert({
      where: { productId: prod.id },
      update: {},
      create: {
        productId: prod.id,
        totalClicks: Math.floor(Math.random() * 200) + 50,
        totalConversions: Math.floor(Math.random() * 15) + 2,
        conversionRate: 0.05,
        ctr: 0.12,
        totalCommission: prod.commissionValue * 3,
      },
    });

    // Histórico de preço inicial
    await prisma.priceHistory.create({
      data: {
        productId: prod.id,
        price: prod.price,
        oldPrice: prod.oldPrice,
      },
    });
  }

  console.log('🛍️ Produtos e Métricas seeded com sucesso.');
  console.log('✅ Seed finalizado!');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
