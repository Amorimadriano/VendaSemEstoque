import { MarketplaceIntegration, ProductVerificationResult } from '../MarketplaceIntegration';
import { ExternalProduct } from '../../types';

export interface MercadoLivreIntegrationConfig {
  accessToken?: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
}

type MercadoLivreSearchItem = {
  id?: string;
  title?: string;
  price?: number;
  original_price?: number | null;
  available_quantity?: number;
  sold_quantity?: number;
  condition?: string;
  permalink?: string;
  thumbnail?: string;
  secure_thumbnail?: string;
  pictures?: Array<{
    url?: string;
    secure_url?: string;
  }>;
  status?: string;
  category_id?: string;
  attributes?: Array<{
    id?: string;
    value_name?: string;
  }>;
};

type MercadoLivreBulkItemResponse = {
  code?: number;
  body?: MercadoLivreSearchItem;
};

type MercadoLivreSearchResponse = {
  results?: MercadoLivreSearchItem[];
};

export class MercadoLivreIntegration implements MarketplaceIntegration {
  marketplaceSlug = 'mercadolivre';
  marketplaceName = 'Mercado Livre';

  private accessToken?: string;
  private clientId?: string;
  private clientSecret?: string;
  private refreshToken?: string;

  constructor(config: MercadoLivreIntegrationConfig = {}) {
    this.accessToken = config.accessToken || process.env.MERCADOLIVRE_ACCESS_TOKEN;
    this.clientId = config.clientId || process.env.MERCADOLIVRE_CLIENT_ID;
    this.clientSecret = config.clientSecret || process.env.MERCADOLIVRE_CLIENT_SECRET;
    this.refreshToken = config.refreshToken || process.env.MERCADOLIVRE_REFRESH_TOKEN;
  }

  private async refreshAccessToken(): Promise<string | undefined> {
    const refreshToken = this.refreshToken || process.env.MERCADOLIVRE_REFRESH_TOKEN;
    const clientId = this.clientId || process.env.MERCADOLIVRE_CLIENT_ID;
    const clientSecret = this.clientSecret || process.env.MERCADOLIVRE_CLIENT_SECRET;
    if (!refreshToken || !clientId || !clientSecret) return undefined;

    try {
      const res = await fetch('https://api.mercadolibre.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
        }),
      });
      if (!res.ok) return undefined;
      const data = (await res.json()) as { access_token?: string; refresh_token?: string };
      this.accessToken = data.access_token;
      if (data.refresh_token) {
        this.refreshToken = data.refresh_token;
        process.env.MERCADOLIVRE_REFRESH_TOKEN = data.refresh_token;
      }
      return this.accessToken;
    } catch {
      return undefined;
    }
  }

  private async request(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = new Headers(options.headers);
    headers.set('Accept', 'application/json');
    headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    const token = this.accessToken || process.env.MERCADOLIVRE_ACCESS_TOKEN;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    let response = await fetch(url, {
      ...options,
      headers,
    });

    // Se a requisição autenticada falhar com 401, tenta refresh ou recai imediatamente para acesso público
    if (response.status === 401) {
      let refreshed: string | undefined;
      if (this.refreshToken || process.env.MERCADOLIVRE_REFRESH_TOKEN) {
        refreshed = await this.refreshAccessToken();
      }

      if (refreshed) {
        headers.set('Authorization', `Bearer ${refreshed}`);
        response = await fetch(url, {
          ...options,
          headers,
        });
      } else {
        headers.delete('Authorization');
        response = await fetch(url, {
          ...options,
          headers,
        });
      }
    }

    return response;
  }

  private isValidProductUrl(url?: string): boolean {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();
      const validHost =
        hostname.includes('mercadolivre.com.br') ||
        hostname.includes('mercadolibre.com') ||
        hostname.includes('mercadolivre.com');

      if (!validHost) return false;
      const pathname = parsed.pathname.toLowerCase();
      if (
        hostname.startsWith('lista.') ||
        pathname.includes('/lista') ||
        pathname.includes('/busca') ||
        pathname.includes('/search') ||
        pathname.includes('/categorias')
      ) {
        return false;
      }
      return pathname.length > 1;
    } catch {
      return false;
    }
  }

  private getProductImage(item: MercadoLivreSearchItem): string | null {
    const picture = item.pictures?.find((p) => p.secure_url || p.url);
    let image = picture?.secure_url || picture?.url || item.secure_thumbnail || item.thumbnail;
    if (!image) return null;

    // Normaliza para protocolo seguro e maior resolução
    image = image.replace(/^http:\/\//i, 'https://');
    if (image.includes('-I.jpg')) {
      image = image.replace('-I.jpg', '-O.jpg');
    }
    if (image.includes('-I.webp')) {
      image = image.replace('-I.webp', '-O.webp');
    }

    try {
      const parsed = new URL(image);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
      return image;
    } catch {
      return null;
    }
  }

  private convertProduct(item: MercadoLivreSearchItem, categoryName = 'Mercado Livre'): ExternalProduct | null {
    if (!item.id || typeof item.id !== 'string') return null;
    if (!item.title || item.title.trim().length < 5) return null;

    const price = Number(item.price);
    if (!Number.isFinite(price) || price <= 0) return null;

    const availableQuantity = Number(item.available_quantity ?? 1);
    if (!Number.isFinite(availableQuantity) || availableQuantity <= 0) return null;

    if (item.status && item.status !== 'active') return null;

    const permalink = item.permalink;
    if (!permalink || !this.isValidProductUrl(permalink)) return null;

    const image = this.getProductImage(item);
    if (!image) return null;

    const brand = item.attributes?.find((a) => a.id === 'BRAND')?.value_name;
    const commissionPercentage = Number(process.env.MERCADOLIVRE_COMMISSION_PERCENTAGE || 10);
    const oldPrice = item.original_price && Number(item.original_price) > price ? Number(item.original_price) : undefined;
    const discountPercentage = oldPrice ? Math.round(((oldPrice - price) / oldPrice) * 100) : undefined;

    return {
      externalProductId: item.id.trim(),
      name: item.title.trim(),
      description: `${item.title.trim()}. Produto original com garantia e entrega rápida pelo Mercado Livre.`,
      categoryName,
      brand,
      imageUrl: image,
      images: (item.pictures?.map((p) => p.secure_url || p.url).filter(Boolean) as string[]) || [image],
      price,
      oldPrice,
      discountPercentage,
      rating: 4.8,
      reviewCount: Math.floor(Number(item.sold_quantity || 100) / 4),
      salesCount: Number(item.sold_quantity || 0),
      commissionPercentage,
      commissionValue: Math.round(((price * commissionPercentage) / 100) * 100) / 100,
      originalUrl: permalink,
      affiliateUrl: permalink,
      isAvailable: true,
    };
  }

  async getProducts(query?: string, category?: string, limit = 20): Promise<ExternalProduct[]> {
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
    const searchUrl = new URL('https://api.mercadolibre.com/sites/MLB/search');
    searchUrl.searchParams.set('q', query?.trim() || 'ofertas');
    searchUrl.searchParams.set('limit', String(safeLimit));

    if (category?.trim()) {
      searchUrl.searchParams.set('category', category.trim());
    }

    try {
      const response = await this.request(searchUrl.toString());
      if (response.ok) {
        const text = await response.text();
        if (text.startsWith('{') || text.startsWith('[')) {
          const data = JSON.parse(text) as MercadoLivreSearchResponse;
          if (Array.isArray(data.results) && data.results.length > 0) {
            const products: ExternalProduct[] = [];
            for (const item of data.results) {
              const product = this.convertProduct(item, query || category || 'Mercado Livre');
              if (product) {
                products.push(product);
                if (products.length >= safeLimit) break;
              }
            }
            return products;
          }
        }
      } else {
        console.warn(`[Mercado Livre] Busca retornou HTTP ${response.status}`);
      }
    } catch (error) {
      console.warn('[Mercado Livre] Erro ao buscar produtos:', error);
    }

    return [];
  }

  async getItemsBulk(ids: string[]): Promise<Map<string, ExternalProduct>> {
    const verifiedMap = new Map<string, ExternalProduct>();
    const uniqueIds = Array.from(new Set(ids.map((id) => String(id).trim()).filter(Boolean)));
    if (uniqueIds.length === 0) return verifiedMap;

    const chunkSize = 20;
    for (let index = 0; index < uniqueIds.length; index += chunkSize) {
      const chunk = uniqueIds.slice(index, index + chunkSize);
      const url = `https://api.mercadolibre.com/items?ids=${chunk.map(encodeURIComponent).join(',')}`;

      try {
        const response = await this.request(url);
        if (response.ok) {
          const text = await response.text();
          if (text.startsWith('{') || text.startsWith('[')) {
            const data = JSON.parse(text) as MercadoLivreBulkItemResponse[];
            if (Array.isArray(data)) {
              for (const entry of data) {
                if (Number(entry.code ?? 200) !== 200 || !entry.body?.id) continue;
                const product = this.convertProduct(entry.body);
                if (product && product.externalProductId) {
                  verifiedMap.set(product.externalProductId, product);
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn('[Mercado Livre] Erro na consulta bulk:', err);
      }
    }

    return verifiedMap;
  }

  async verifyProduct(externalId: string): Promise<ProductVerificationResult> {
    const id = String(externalId || '').trim();
    if (!id) return { status: 'NOT_FOUND', reason: 'ID ausente' };

    const url = `https://api.mercadolibre.com/items/${encodeURIComponent(id)}`;
    try {
      const response = await this.request(url);
      if (response.status === 404 || response.status === 410) {
        return { status: 'NOT_FOUND', reason: `Anúncio removido ou inexistente (HTTP ${response.status})` };
      }
      if (response.status === 429 || response.status >= 500) {
        return { status: 'ERROR', reason: `Falha temporária na API do Mercado Livre (HTTP ${response.status})` };
      }
      if (!response.ok) {
        return { status: 'ERROR', reason: `HTTP ${response.status} ao consultar item` };
      }

      const text = await response.text();
      if (!text.startsWith('{') && !text.startsWith('[')) {
        return { status: 'ERROR', reason: 'Resposta não-JSON' };
      }

      const item = JSON.parse(text) as MercadoLivreSearchItem;
      if (!item || !item.id) return { status: 'NOT_FOUND', reason: 'Item sem ID' };
      if (item.status && item.status !== 'active') {
        return { status: 'NOT_FOUND', reason: `Anúncio com status inativo: ${item.status}` };
      }
      if (Number(item.available_quantity || 0) <= 0) {
        return { status: 'NOT_FOUND', reason: 'Estoque esgotado' };
      }

      const product = this.convertProduct(item);
      if (!product) return { status: 'NOT_FOUND', reason: 'Item não atende aos requisitos de conversão' };

      return { status: 'VERIFIED', product };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { status: 'ERROR', reason: `Erro de rede ao consultar Mercado Livre: ${msg}` };
    }
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
    if (res.status === 'VERIFIED') return true;
    if (res.status === 'NOT_FOUND') return false;
    throw new Error(`Falha temporária ao verificar disponibilidade no Mercado Livre: ${res.reason}`);
  }

  async getCategories(): Promise<{ id: string; name: string; slug: string }[]> {
    try {
      const response = await this.request('https://api.mercadolibre.com/sites/MLB/categories');
      if (!response.ok) return [];
      const data = await response.json();
      if (!Array.isArray(data)) return [];
      return data.map((cat: any) => ({
        id: String(cat.id || ''),
        name: String(cat.name || ''),
        slug: String(cat.name || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, ''),
      }));
    } catch {
      return [];
    }
  }

  async createAffiliateLink(productUrl: string, customTrackingId?: string): Promise<string> {
    if (!productUrl || !productUrl.startsWith('http')) return productUrl;
    try {
      const url = new URL(productUrl);
      const toolId = process.env.MERCADOLIVRE_TOOL_ID || '21960078';
      const word = customTrackingId || process.env.MERCADOLIVRE_WORD || 'amorimdossantosadriano';
      if (toolId) url.searchParams.set('matt_tool', toolId);
      if (word) url.searchParams.set('matt_word', word);
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