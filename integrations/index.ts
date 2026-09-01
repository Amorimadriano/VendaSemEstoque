import { MarketplaceIntegration } from './MarketplaceIntegration';
import { AmazonIntegration } from './amazon/AmazonIntegration';
import { MercadoLivreIntegration } from './mercadolivre/MercadoLivreIntegration';
import { ShopeeIntegration } from './shopee/ShopeeIntegration';
import { AliExpressIntegration } from './aliexpress/AliExpressIntegration';
import { MockMarketplace } from './mock/MockMarketplace';

const integrations: Record<string, MarketplaceIntegration> = {
  amazon: new AmazonIntegration(),
  mercadolivre: new MercadoLivreIntegration(),
  shopee: new ShopeeIntegration(),
  aliexpress: new AliExpressIntegration(),
  mock: new MockMarketplace(),
};

export function getMarketplaceIntegration(slug: string): MarketplaceIntegration {
  return integrations[slug.toLowerCase()] || integrations.mock;
}

export function getAllMarketplaceIntegrations(): MarketplaceIntegration[] {
  return Object.values(integrations);
}
