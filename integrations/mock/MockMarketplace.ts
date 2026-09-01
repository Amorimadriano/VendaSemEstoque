import { MarketplaceIntegration } from '../MarketplaceIntegration';
import { ExternalProduct } from '@/types';

export class MockMarketplace implements MarketplaceIntegration {
  marketplaceSlug: string;
  marketplaceName: string;

  constructor(slug = 'mock-store', name = 'Plataforma Parceira MOCK') {
    this.marketplaceSlug = slug;
    this.marketplaceName = name;
  }

  async getProducts(query?: string, category?: string, limit = 10): Promise<ExternalProduct[]> {
    const mockProducts: ExternalProduct[] = [
      {
        externalProductId: 'MOCK-101',
        name: 'Smartphone Galaxy S24 Ultra 512GB Titânio',
        description: 'Smartphone de última geração com câmera de 200MP, tela Dynamic AMOLED 2X de 6.8" e Galaxy AI.',
        categoryName: 'Eletrônicos',
        brand: 'Samsung',
        imageUrl: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=500&q=80',
        images: [
          'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=500&q=80',
          'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&q=80'
        ],
        price: 5999.00,
        oldPrice: 7499.00,
        discountPercentage: 20,
        rating: 4.9,
        reviewCount: 1420,
        commissionPercentage: 8,
        commissionValue: 479.92,
        originalUrl: 'https://example.com/product/mock-101',
        affiliateUrl: 'https://example.com/affiliate/mock-101?tag=vendasemestoque-20',
        isAvailable: true
      },
      {
        externalProductId: 'MOCK-102',
        name: 'Fone de Ouvido Bluetooth Noise Cancelling Sony WH-1000XM5',
        description: 'Cancelamento de ruído líder de mercado, áudio de alta resolução e bateria de até 30 horas.',
        categoryName: 'Áudio',
        brand: 'Sony',
        imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80',
        images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80'],
        price: 1899.90,
        oldPrice: 2499.00,
        discountPercentage: 24,
        rating: 4.8,
        reviewCount: 890,
        commissionPercentage: 10,
        commissionValue: 189.99,
        originalUrl: 'https://example.com/product/mock-102',
        affiliateUrl: 'https://example.com/affiliate/mock-102?tag=vendasemestoque-20',
        isAvailable: true
      },
      {
        externalProductId: 'MOCK-103',
        name: 'Smart TV 55" 4K OLED LG C3 120Hz Dolby Vision',
        description: 'Pixels que se acendem individualmente, processador α9 Gen6 AI, 4 entradas HDMI 2.1 perfeitas para games.',
        categoryName: 'Eletrônicos',
        brand: 'LG',
        imageUrl: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=500&q=80',
        images: ['https://images.unsplash.com/photo-1593784991095-a205069470b6?w=500&q=80'],
        price: 4999.00,
        oldPrice: 6299.00,
        discountPercentage: 21,
        rating: 4.9,
        reviewCount: 610,
        commissionPercentage: 7,
        commissionValue: 349.93,
        originalUrl: 'https://example.com/product/mock-103',
        affiliateUrl: 'https://example.com/affiliate/mock-103?tag=vendasemestoque-20',
        isAvailable: true
      },
      {
        externalProductId: 'MOCK-104',
        name: 'Cafeteira Espresso Nespresso Essenza Mini',
        description: 'Design ultracompacto, alta pressão de 19 bar e 2 tamanhos de xícara programáveis.',
        categoryName: 'Eletrodomésticos',
        brand: 'Nespresso',
        imageUrl: 'https://images.unsplash.com/photo-1517668808822-9ed02810a0e9?w=500&q=80',
        images: ['https://images.unsplash.com/photo-1517668808822-9ed02810a0e9?w=500&q=80'],
        price: 399.90,
        oldPrice: 549.90,
        discountPercentage: 27,
        rating: 4.7,
        reviewCount: 2300,
        commissionPercentage: 12,
        commissionValue: 47.98,
        originalUrl: 'https://example.com/product/mock-104',
        affiliateUrl: 'https://example.com/affiliate/mock-104?tag=vendasemestoque-20',
        isAvailable: true
      },
      {
        externalProductId: 'MOCK-105',
        name: 'Cadeira Gamer Erggonômica Reclinável com Braços 3D',
        description: 'Suporte lombar ajustável, estofamento de alta densidade e inclinação até 180°.',
        categoryName: 'Móveis',
        brand: 'ThunderX',
        imageUrl: 'https://images.unsplash.com/photo-1580481072645-022f9a6d83d0?w=500&q=80',
        images: ['https://images.unsplash.com/photo-1580481072645-022f9a6d83d0?w=500&q=80'],
        price: 899.00,
        oldPrice: 1299.00,
        discountPercentage: 30,
        rating: 4.6,
        reviewCount: 450,
        commissionPercentage: 9,
        commissionValue: 80.91,
        originalUrl: 'https://example.com/product/mock-105',
        affiliateUrl: 'https://example.com/affiliate/mock-105?tag=vendasemestoque-20',
        isAvailable: true
      }
    ];

    let filtered = mockProducts;
    if (query) {
      filtered = filtered.filter(p => p.name.toLowerCase().includes(query.toLowerCase()) || p.description.toLowerCase().includes(query.toLowerCase()));
    }
    if (category) {
      filtered = filtered.filter(p => p.categoryName.toLowerCase() === category.toLowerCase());
    }

    return filtered.slice(0, limit);
  }

  async getProduct(externalId: string): Promise<ExternalProduct | null> {
    const products = await this.getProducts();
    return products.find(p => p.externalProductId === externalId) || null;
  }

  async getCategories(): Promise<{ id: string; name: string; slug: string }[]> {
    return [
      { id: 'cat-1', name: 'Eletrônicos', slug: 'eletronicos' },
      { id: 'cat-2', name: 'Áudio', slug: 'audio' },
      { id: 'cat-3', name: 'Eletrodomésticos', slug: 'eletrodomesticos' },
      { id: 'cat-4', name: 'Móveis', slug: 'moveis' },
      { id: 'cat-5', name: 'Informática', slug: 'informatica' },
    ];
  }

  async getPrice(externalId: string): Promise<{ price: number; oldPrice?: number } | null> {
    const product = await this.getProduct(externalId);
    if (!product) return null;
    return { price: product.price, oldPrice: product.oldPrice };
  }

  async getAvailability(externalId: string): Promise<boolean> {
    const product = await this.getProduct(externalId);
    return product ? product.isAvailable : false;
  }

  async createAffiliateLink(productUrl: string, customTrackingId?: string): Promise<string> {
    const tag = process.env.AFFILIATE_TAG || 'vendasemestoque-20';
    const tracking = customTrackingId ? `&subid=${customTrackingId}` : '';
    return `${productUrl}?tag=${tag}${tracking}`;
  }

  async getClicks(startDate?: Date, endDate?: Date): Promise<number> {
    return 154; // Valor simulado MOCK
  }

  async getConversions(startDate?: Date, endDate?: Date): Promise<any[]> {
    return [
      { orderExternalId: 'ORD-991', saleValue: 1899.90, commissionValue: 189.99, status: 'APPROVED' },
      { orderExternalId: 'ORD-992', saleValue: 399.90, commissionValue: 47.98, status: 'PENDING' }
    ];
  }

  async getCommissions(startDate?: Date, endDate?: Date): Promise<{ total: number; pending: number; approved: number }> {
    return {
      total: 237.97,
      pending: 47.98,
      approved: 189.99
    };
  }
}
