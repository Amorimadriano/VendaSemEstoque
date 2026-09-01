import { MarketplaceIntegration } from '../MarketplaceIntegration';
import { MockMarketplace } from '../mock/MockMarketplace';
import { ExternalProduct } from '@/types';

export class ShopeeIntegration implements MarketplaceIntegration {
  marketplaceSlug = 'shopee';
  marketplaceName = 'Shopee';
  private mockFallback = new MockMarketplace('shopee', 'Shopee');

  async getProducts(query?: string, category?: string, limit = 10): Promise<ExternalProduct[]> {
    return this.mockFallback.getProducts(query, category, limit);
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
    url.searchParams.set('smtt', 'vendasemestoque');
    if (customTrackingId) {
      url.searchParams.set('sub_id', customTrackingId);
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
