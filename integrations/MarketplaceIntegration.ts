import { ExternalProduct } from '../types';

export interface MarketplaceIntegration {
  marketplaceSlug: string;
  marketplaceName: string;

  getProducts(query?: string, category?: string, limit?: number): Promise<ExternalProduct[]>;
  getProduct(externalId: string): Promise<ExternalProduct | null>;
  getCategories(): Promise<{ id: string; name: string; slug: string }[]>;
  getPrice(externalId: string): Promise<{ price: number; oldPrice?: number } | null>;
  getAvailability(externalId: string): Promise<boolean>;
  createAffiliateLink(productUrl: string, customTrackingId?: string): Promise<string>;
  getClicks(startDate?: Date, endDate?: Date): Promise<number>;
  getConversions(startDate?: Date, endDate?: Date): Promise<any[]>;
  getCommissions(startDate?: Date, endDate?: Date): Promise<{ total: number; pending: number; approved: number }>;
}
