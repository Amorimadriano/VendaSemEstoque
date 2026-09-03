import { MarketplaceIntegration } from '../MarketplaceIntegration';
import { MockMarketplace } from '../mock/MockMarketplace';
import { ExternalProduct } from '../../types';

export class MercadoLivreIntegration implements MarketplaceIntegration {
  marketplaceSlug = 'mercadolivre';
  marketplaceName = 'Mercado Livre';
  private mockFallback = new MockMarketplace('mercadolivre', 'Mercado Livre');

  async getProducts(query?: string, category?: string, limit = 10): Promise<ExternalProduct[]> {
    const search = new URL('https://api.mercadolibre.com/sites/MLB/search');
    search.searchParams.set('q', query || 'ofertas');
    search.searchParams.set('limit', String(Math.min(limit, 50)));
    search.searchParams.set('sort', 'relevance');

    const response = await fetch(search, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Mercado Livre API returned ${response.status}`);

    const data = await response.json() as {
      results?: Array<{
        id: string;
        title: string;
        permalink: string;
        thumbnail?: string;
        pictures?: Array<{ url: string }>;
        price: number;
        original_price?: number;
        available_quantity?: number;
        sold_quantity?: number;
        category_id?: string;
        attributes?: Array<{ id: string; value_name?: string }>;
      }>;
    };

    return (data.results || []).map((item) => {
      const soldQuantity = item.sold_quantity || 0;
      const imageUrl = item.thumbnail?.replace('-I.jpg', '-O.jpg') || item.pictures?.[0]?.url || '';
      const oldPrice = item.original_price && item.original_price > item.price ? item.original_price : undefined;
      const discountPercentage = oldPrice ? Math.round(((oldPrice - item.price) / oldPrice) * 100) : undefined;
      const brand = item.attributes?.find((attribute) => attribute.id === 'BRAND')?.value_name;

      return {
        externalProductId: item.id,
        name: item.title,
        description: item.title,
        categoryName: category || 'Ofertas do Mercado Livre',
        brand,
        imageUrl,
        images: item.pictures?.map((picture) => picture.url) || [imageUrl],
        price: item.price,
        oldPrice,
        discountPercentage,
        rating: 0,
        reviewCount: 0,
        commissionPercentage: Number(process.env.MERCADOLIVRE_COMMISSION_PERCENTAGE || 10),
        commissionValue: 0,
        originalUrl: item.permalink,
        affiliateUrl: item.permalink,
        isAvailable: (item.available_quantity || 0) > 0,
      } satisfies ExternalProduct;
    });
  }

  async getProduct(externalId: string): Promise<ExternalProduct | null> {
    return this.mockFallback.getProduct(externalId);
  }

  async getCategories(): Promise<{ id: string; name: string; slug: string }[]> {
    return this.mockFallback.getCategories();
  }

  async getPrice(externalId: string): Promise<{ price: number; oldPrice?: number } | null> {
    return this.mockFallback.getPrice(externalId);
  }

  async getAvailability(externalId: string): Promise<boolean> {
    return this.mockFallback.getAvailability(externalId);
  }

  async createAffiliateLink(productUrl: string, customTrackingId?: string): Promise<string> {
    const url = new URL(productUrl.startsWith('http') ? productUrl : `https://${productUrl}`);
    url.searchParams.set('matt_tool', process.env.MERCADOLIVRE_TOOL_ID || '12345678');
    if (customTrackingId) {
      url.searchParams.set('matt_word', customTrackingId);
    }
    return url.toString();
  }

  async getClicks(startDate?: Date, endDate?: Date): Promise<number> {
    return this.mockFallback.getClicks(startDate, endDate);
  }

  async getConversions(startDate?: Date, endDate?: Date): Promise<any[]> {
    return this.mockFallback.getConversions(startDate, endDate);
  }

  async getCommissions(startDate?: Date, endDate?: Date): Promise<{ total: number; pending: number; approved: number }> {
    return this.mockFallback.getCommissions(startDate, endDate);
  }
}
