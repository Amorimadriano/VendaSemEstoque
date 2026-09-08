import { MarketplaceIntegration, ProductVerificationResult } from '../MarketplaceIntegration';
import { ExternalProduct } from '../../types';

type ShopeeNode = {
  itemId?: string | number;
  productName?: string;
  price?: number;
  priceMin?: number;
  priceMax?: number;
  imageUrl?: string;
  productLink?: string;
  offerLink?: string;
  commissionRate?: string | number;
  sales?: number;
  ratingStar?: number;
};

export class ShopeeIntegration implements MarketplaceIntegration {
  marketplaceSlug = 'shopee';
  marketplaceName = 'Shopee';

  private appId?: string;
  private secret?: string;

  constructor() {
    this.appId = process.env.SHOPEE_APP_ID;
    this.secret = process.env.SHOPEE_SECRET;
  }

  private hasCredentials(): boolean {
    return Boolean(this.appId && this.secret);
  }

  private async generateAuthHeaders(payload: string) {
    const timestamp = Math.floor(Date.now() / 1000);
    const factor = `${this.appId}${timestamp}${payload}${this.secret}`;
    const msgBuffer = new TextEncoder().encode(factor);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const signature = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return {
      'Content-Type': 'application/json',
      'Authorization': `SHA256 Credential=${this.appId}, Timestamp=${timestamp}, Signature=${signature}`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
    };
  }

  private convertNode(node: ShopeeNode, categoryName = 'Shopee'): ExternalProduct | null {
    const itemId = String(node.itemId || '').trim();
    const name = String(node.productName || '').trim();
    const originalUrl = String(node.productLink || node.offerLink || '').trim();
    const imageUrl = String(node.imageUrl || '').trim();
    const price = Number(node.price || node.priceMin || 0);

    if (!itemId || !name || name.length < 5 || !originalUrl || !imageUrl.startsWith('http') || price <= 0) {
      return null;
    }

    const commissionRateRaw = Number(node.commissionRate || 8);
    const commissionPercentage = commissionRateRaw > 1 ? commissionRateRaw : commissionRateRaw * 100;
    const salesCount = Number(node.sales || 0);
    const rating = Number(node.ratingStar || 4.8);

    return {
      externalProductId: itemId,
      name,
      description: `${name}. Produto original disponível na Shopee com garantia de entrega e proteção ao comprador.`,
      categoryName,
      imageUrl,
      images: [imageUrl],
      price,
      rating,
      reviewCount: Math.floor(salesCount / 3),
      salesCount,
      commissionPercentage,
      commissionValue: Math.round(((price * commissionPercentage) / 100) * 100) / 100,
      originalUrl,
      affiliateUrl: node.offerLink || originalUrl,
      isAvailable: true,
    };
  }

  async getProducts(query?: string, category?: string, limit = 10): Promise<ExternalProduct[]> {
    if (!this.hasCredentials()) {
      return [];
    }

    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const gqlQuery = `
      query {
        productOfferV2(keyword: "${query || 'ofertas'}", page: 1, limit: ${safeLimit}) {
          nodes {
            itemId
            productName
            price
            priceMin
            priceMax
            imageUrl
            productLink
            offerLink
            commissionRate
            sales
            ratingStar
          }
        }
      }
    `;

    const payload = JSON.stringify({ query: gqlQuery });
    const headers = await this.generateAuthHeaders(payload);

    try {
      const response = await fetch('https://open-api.affiliate.shopee.com.br/graphql', {
        method: 'POST',
        headers,
        body: payload,
      });

      if (!response.ok) {
        console.warn(`[Shopee] GraphQL retornou HTTP ${response.status}`);
        return [];
      }

      const text = await response.text();
      if (!text.startsWith('{') && !text.startsWith('[')) {
        console.warn('[Shopee] Resposta não-JSON da API Shopee');
        return [];
      }

      const resJson = JSON.parse(text);
      const nodes: ShopeeNode[] = resJson?.data?.productOfferV2?.nodes || [];
      const products: ExternalProduct[] = [];

      for (const node of nodes) {
        const p = this.convertNode(node, query || category || 'Shopee');
        if (p) {
          products.push(p);
          if (products.length >= safeLimit) break;
        }
      }

      return products;
    } catch (err) {
      console.warn('[Shopee] Erro ao buscar produtos:', err);
      return [];
    }
  }

  async verifyProduct(externalId: string): Promise<ProductVerificationResult> {
    const id = String(externalId || '').trim();
    if (!id) return { status: 'NOT_FOUND', reason: 'ID ausente' };

    if (!this.hasCredentials()) {
      return { status: 'ERROR', reason: 'Credenciais da Shopee não configuradas' };
    }

    const products = await this.getProducts(id, undefined, 1);
    const item = products.find((p) => p.externalProductId === id);
    if (item) {
      return { status: 'VERIFIED', product: item };
    }

    return { status: 'NOT_FOUND', reason: 'Produto Shopee não encontrado ou inativo' };
  }

  async getProduct(externalId: string): Promise<ExternalProduct | null> {
    const res = await this.verifyProduct(externalId);
    return res.status === 'VERIFIED' && res.product ? res.product : null;
  }

  async getPrice(externalId: string): Promise<{ price: number; oldPrice?: number } | null> {
    const product = await this.getProduct(externalId);
    return product ? { price: product.price, oldPrice: product.oldPrice } : null;
  }

  async getAvailability(externalId: string): Promise<boolean> {
    const res = await this.verifyProduct(externalId);
    return res.status === 'VERIFIED';
  }

  async getCategories(): Promise<{ id: string; name: string; slug: string }[]> {
    return [];
  }

  async createAffiliateLink(productUrl: string, customTrackingId?: string): Promise<string> {
    if (!productUrl || !productUrl.startsWith('http')) return productUrl;
    try {
      const url = new URL(productUrl);
      if (customTrackingId) {
        url.searchParams.set('sub_id', customTrackingId);
      }
      return url.toString();
    } catch {
      return productUrl;
    }
  }

  async getClicks(_startDate?: Date, _endDate?: Date): Promise<number> {
    return 0;
  }

  async getConversions(_startDate?: Date, _endDate?: Date): Promise<any[]> {
    return [];
  }

  async getCommissions(_startDate?: Date, _endDate?: Date): Promise<{ total: number; pending: number; approved: number }> {
    return { total: 0, pending: 0, approved: 0 };
  }
}
