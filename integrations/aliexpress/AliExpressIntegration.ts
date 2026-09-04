import { MarketplaceIntegration } from '../MarketplaceIntegration';
import { ExternalProduct } from '../../types';

export class AliExpressIntegration implements MarketplaceIntegration {
  marketplaceSlug = 'aliexpress';
  marketplaceName = 'AliExpress';

  async getProducts(query?: string, category?: string, limit = 10): Promise<ExternalProduct[]> {
    const params: Record<string, string> = {
      app_key: process.env.ALIEXPRESS_APP_KEY || '',
      method: 'aliexpress.affiliate.product.query',
      sign_method: 'hmac',
      format: 'json',
      v: '2.0',
      timestamp: new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14),
      keywords: query || 'best sellers',
      page_size: String(Math.min(limit, 50)),
      target_currency: 'BRL',
      target_language: 'PT',
      tracking_id: process.env.ALIEXPRESS_TRACKING_ID || '',
    };
    if (category) params.category_ids = category;
    params.sign = await this.sign(params);

    const response = await fetch(`https://api-sg.aliexpress.com/sync?${new URLSearchParams(params)}`);
    if (!response.ok) throw new Error(`AliExpress API returned ${response.status}`);
    const payload = await response.json() as any;
    const result = payload.aliexpress_affiliate_product_query_response?.resp_result?.result;
    if (result?.resp_code && result.resp_code !== 200) throw new Error(`AliExpress API returned ${result.resp_code}: ${result.resp_msg || 'request failed'}`);

    const products = result?.products?.product || result?.products || [];
    return products.map((item: any) => {
      const price = Number(item.target_sale_price || item.sale_price || item.original_price || 0);
      const oldPrice = Number(item.target_original_price || item.original_price || 0) || undefined;
      const imageUrl = item.product_main_image_url || item.image_url || '';
      return {
        externalProductId: String(item.product_id),
        name: item.product_title || item.product_detail_url,
        description: item.product_title || 'Produto AliExpress',
        categoryName: category || 'Ofertas do AliExpress',
        imageUrl,
        images: imageUrl ? [imageUrl] : [],
        price,
        oldPrice: oldPrice && oldPrice > price ? oldPrice : undefined,
        discountPercentage: oldPrice && oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : undefined,
        rating: Number(item.evaluate_rate || 0),
        reviewCount: Number(item.lastest_volume || 0),
        commissionPercentage: Number(item.commission_rate || process.env.ALIEXPRESS_COMMISSION_PERCENTAGE || 8),
        commissionValue: 0,
        originalUrl: item.product_detail_url,
        affiliateUrl: item.promotion_link || item.product_detail_url,
        isAvailable: price > 0,
      } satisfies ExternalProduct;
    }).filter((product: ExternalProduct) => product.externalProductId && product.originalUrl);
  }

  async getProduct(externalId: string): Promise<ExternalProduct | null> {
    const products = await this.getProducts(externalId, undefined, 1);
    return products[0] || null;
  }

  async getCategories(): Promise<{ id: string; name: string; slug: string }[]> {
    return [];
  }

  async getPrice(externalId: string): Promise<{ price: number; oldPrice?: number } | null> {
    const product = await this.getProduct(externalId);
    return product ? { price: product.price, oldPrice: product.oldPrice } : null;
  }

  async getAvailability(externalId: string): Promise<boolean> {
    return Boolean(await this.getProduct(externalId));
  }

  async createAffiliateLink(productUrl: string, customTrackingId?: string): Promise<string> {
    const url = new URL(productUrl.startsWith('http') ? productUrl : `https://${productUrl}`);
    url.searchParams.set('tracking_id', process.env.ALIEXPRESS_TRACKING_ID || '');
    if (customTrackingId) {
      url.searchParams.set('aff_platform', customTrackingId);
    }
    return url.toString();
  }

  async getClicks(startDate?: Date, endDate?: Date): Promise<number> {
    throw new Error('AliExpress clicks require the affiliate reporting API');
  }

  async getConversions(startDate?: Date, endDate?: Date): Promise<any[]> {
    throw new Error('AliExpress conversions require the affiliate reporting API');
  }

  async getCommissions(startDate?: Date, endDate?: Date): Promise<{ total: number; pending: number; approved: number }> {
    throw new Error('AliExpress commissions require the affiliate reporting API');
  }

  private async sign(params: Record<string, string>) {
    const secret = process.env.ALIEXPRESS_APP_SECRET || '';
    const content = Object.keys(params).sort().map((key) => `${key}${params[key]}`).join('');
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(content));
    return Array.from(new Uint8Array(signature)).map((byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
  }
}
