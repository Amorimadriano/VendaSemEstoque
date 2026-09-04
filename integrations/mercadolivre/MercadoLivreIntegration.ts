import { MarketplaceIntegration } from '../MarketplaceIntegration';
import { ExternalProduct } from '../../types';

export class MercadoLivreIntegration implements MarketplaceIntegration {
  marketplaceSlug = 'mercadolivre';
  marketplaceName = 'Mercado Livre';
  private accessToken?: string;

  private async getAccessToken() {
    if (this.accessToken) return this.accessToken;
    if (process.env.MERCADOLIVRE_REFRESH_TOKEN) {
      return this.refreshAccessToken();
    }
    this.accessToken = process.env.MERCADOLIVRE_ACCESS_TOKEN;
    return this.accessToken;
  }

  private async refreshAccessToken() {
    if (!process.env.MERCADOLIVRE_REFRESH_TOKEN || !process.env.MERCADOLIVRE_CLIENT_ID || !process.env.MERCADOLIVRE_CLIENT_SECRET) return undefined;
    const response = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.MERCADOLIVRE_CLIENT_ID,
        client_secret: process.env.MERCADOLIVRE_CLIENT_SECRET,
        refresh_token: process.env.MERCADOLIVRE_REFRESH_TOKEN,
      }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Mercado Livre token refresh failed (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ''}`);
    }
    const data = await response.json() as { access_token?: string; refresh_token?: string };
    this.accessToken = data.access_token;
    if (data.refresh_token) process.env.MERCADOLIVRE_REFRESH_TOKEN = data.refresh_token;
    return this.accessToken;
  }

  async getProducts(query?: string, category?: string, limit = 10): Promise<ExternalProduct[]> {
    const search = new URL('https://api.mercadolibre.com/sites/MLB/search');
    search.searchParams.set('q', query || 'ofertas');
    search.searchParams.set('limit', String(Math.min(limit, 50)));
    search.searchParams.set('sort', 'relevance');

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent': 'VendaSemEstoque/1.0',
    };
    let accessToken = await this.getAccessToken();
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    let response: Response | undefined;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      response = await fetch(search, { headers });
      if ((response.status === 401 || response.status === 403) && process.env.MERCADOLIVRE_REFRESH_TOKEN) {
        accessToken = await this.refreshAccessToken();
        if (accessToken) {
          headers.Authorization = `Bearer ${accessToken}`;
          response = await fetch(search, { headers });
        }
      }
      if (response.ok) break;
      if (![429, 500, 502, 503, 504].includes(response.status)) break;
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
    if (!response?.ok) {
      const detail = response ? await response.text().catch(() => '') : '';
      if (response?.status === 401 || response?.status === 403) {
        const publicHeaders = {
          Accept: 'application/json',
          'User-Agent': 'VendaSemEstoque/1.0',
        };
        const publicResponse = await fetch(search, { headers: publicHeaders });
        if (publicResponse.ok) {
          response = publicResponse;
        } else {
          throw new Error('Mercado Livre recusou a autorização e a busca pública também falhou (403). Verifique se o refresh token pertence ao mesmo CLIENT_ID da aplicação.');
        }
      }
      if (!response.ok) throw new Error(`Mercado Livre API returned ${response?.status || 'unknown'}${detail ? `: ${detail.slice(0, 200)}` : ''}`);
    }

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
          salesCount: item.sold_quantity || 0,
        commissionPercentage: Number(process.env.MERCADOLIVRE_COMMISSION_PERCENTAGE || 10),
        commissionValue: 0,
        originalUrl: item.permalink,
        affiliateUrl: item.permalink,
        isAvailable: (item.available_quantity || 0) > 0,
      } satisfies ExternalProduct;
    });
  }

  async getProduct(externalId: string): Promise<ExternalProduct | null> {
    const response = await fetch(`https://api.mercadolibre.com/items/${encodeURIComponent(externalId)}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'VendaSemEstoque/1.0' },
    });
    if (!response.ok) return null;
    const item = await response.json() as {
      id: string;
      title: string;
      permalink: string;
      thumbnail?: string;
      pictures?: Array<{ url: string }>;
      price: number;
      original_price?: number;
      available_quantity?: number;
      sold_quantity?: number;
      attributes?: Array<{ id: string; value_name?: string }>;
    };
    const oldPrice = item.original_price && item.original_price > item.price ? item.original_price : undefined;
    return {
      externalProductId: item.id,
      name: item.title,
      description: item.title,
      categoryName: 'Ofertas do Mercado Livre',
      brand: item.attributes?.find((attribute) => attribute.id === 'BRAND')?.value_name,
      imageUrl: item.thumbnail?.replace('-I.jpg', '-O.jpg') || item.pictures?.[0]?.url || '',
      images: item.pictures?.map((picture) => picture.url) || [],
      price: item.price,
      oldPrice,
      discountPercentage: oldPrice ? Math.round(((oldPrice - item.price) / oldPrice) * 100) : undefined,
      rating: 0,
      reviewCount: 0,
      salesCount: item.sold_quantity || 0,
      commissionPercentage: Number(process.env.MERCADOLIVRE_COMMISSION_PERCENTAGE || 10),
      commissionValue: 0,
      originalUrl: item.permalink,
      affiliateUrl: item.permalink,
      isAvailable: (item.available_quantity || 0) > 0,
    } satisfies ExternalProduct;
  }

  async getCategories(): Promise<{ id: string; name: string; slug: string }[]> {
    const response = await fetch('https://api.mercadolibre.com/sites/MLB/categories', { headers: { Accept: 'application/json', 'User-Agent': 'VendaSemEstoque/1.0' } });
    if (!response.ok) throw new Error(`Mercado Livre categories API returned ${response.status}`);
    const categories = await response.json() as Array<{ id: string; name: string }>;
    return categories.map((category) => ({ id: category.id, name: category.name, slug: category.id.toLowerCase() }));
  }

  async getPrice(externalId: string): Promise<{ price: number; oldPrice?: number } | null> {
    const product = await this.getProduct(externalId);
    return product ? { price: product.price, oldPrice: product.oldPrice } : null;
  }

  async getAvailability(externalId: string): Promise<boolean> {
    const product = await this.getProduct(externalId);
    return Boolean(product?.isAvailable);
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
    throw new Error('Mercado Livre clicks require the affiliate reporting API');
  }

  async getConversions(startDate?: Date, endDate?: Date): Promise<any[]> {
    throw new Error('Mercado Livre conversions require the affiliate reporting API');
  }

  async getCommissions(startDate?: Date, endDate?: Date): Promise<{ total: number; pending: number; approved: number }> {
    throw new Error('Mercado Livre commissions require the affiliate reporting API');
  }
}
