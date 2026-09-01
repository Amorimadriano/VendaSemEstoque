import { MarketplaceIntegration } from '../MarketplaceIntegration';
import { MockMarketplace } from '../mock/MockMarketplace';
import { ExternalProduct } from '@/types';

export class AliExpressIntegration implements MarketplaceIntegration {
  marketplaceSlug = 'aliexpress';
  marketplaceName = 'AliExpress';
  private mockFallback = new MockMarketplace('aliexpress', 'AliExpress');

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
    url.searchParams.set('aff_trace_key', process.env.ALIEXPRESS_TRACE_KEY || 'vendasemestoque');
    if (customTrackingId) {
      url.searchParams.set('aff_platform', customTrackingId);
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
