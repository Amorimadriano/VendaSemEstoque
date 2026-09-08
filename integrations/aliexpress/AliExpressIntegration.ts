import { MarketplaceIntegration, ProductVerificationResult } from '../MarketplaceIntegration';
import { ExternalProduct } from '../../types';

type AliExpressApiProduct = {
  product_id?: string | number;
  product_title?: string;
  product_detail_url?: string;
  product_main_image_url?: string;
  image_url?: string;

  target_sale_price?: string | number;
  sale_price?: string | number;
  original_price?: string | number;
  target_original_price?: string | number;

  evaluate_rate?: string | number;
  lastest_volume?: string | number;
  commission_rate?: string | number;

  promotion_link?: string;
};

export class AliExpressIntegration implements MarketplaceIntegration {
  marketplaceSlug = 'aliexpress';
  marketplaceName = 'AliExpress';

  private hasCredentials(): boolean {
    return Boolean(
      process.env.ALIEXPRESS_APP_KEY &&
      process.env.ALIEXPRESS_APP_SECRET &&
      process.env.ALIEXPRESS_TRACKING_ID
    );
  }

  private assertCredentials() {
    const missing: string[] = [];
    if (!process.env.ALIEXPRESS_APP_KEY) missing.push('ALIEXPRESS_APP_KEY');
    if (!process.env.ALIEXPRESS_APP_SECRET) missing.push('ALIEXPRESS_APP_SECRET');
    if (!process.env.ALIEXPRESS_TRACKING_ID) missing.push('ALIEXPRESS_TRACKING_ID');

    if (missing.length > 0) {
      throw new Error(`Credenciais do AliExpress ausentes: ${missing.join(', ')}`);
    }
  }

  async getProducts(
    query?: string,
    category?: string,
    limit = 10
  ): Promise<ExternalProduct[]> {
    this.assertCredentials();

    const safeLimit = Math.min(Math.max(limit, 1), 50);

    const params: Record<string, string> = {
      app_key: process.env.ALIEXPRESS_APP_KEY || '',
      method: 'aliexpress.affiliate.product.query',
      sign_method: 'hmac-sha256',
      format: 'json',
      v: '2.0',
      timestamp: this.formatTimestamp(new Date()),
      keywords: query || 'best sellers',
      page_no: '1',
      page_size: String(safeLimit),
      ship_to_country: 'BR',
      sort: 'VOLUME_DESC',
      target_currency: 'BRL',
      target_language: 'PT',
      tracking_id: process.env.ALIEXPRESS_TRACKING_ID || '',
    };

    if (category) {
      params.category_ids = category;
    }

    params.sign = await this.sign(params);

    const response = await fetch(
      `https://api-sg.aliexpress.com/sync?${new URLSearchParams(params)}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
        },
      }
    );

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`AliExpress API retornou HTTP ${response.status}: ${text.slice(0, 300)}`);
    }

    if (!text.startsWith('{') && !text.startsWith('[')) {
      throw new Error(`AliExpress retornou resposta não-JSON (possível bloqueio): ${text.slice(0, 300)}`);
    }

    const payload = JSON.parse(text);
    if (payload?.error_response) {
      throw new Error(`AliExpress API error: ${JSON.stringify(payload.error_response).slice(0, 500)}`);
    }

    const responseData = payload?.aliexpress_affiliate_product_query_response || payload;
    let result = responseData?.resp_result?.result || responseData?.result || responseData;
    if (typeof result === 'string') {
      try {
        result = JSON.parse(result);
      } catch {
        throw new Error('Resposta do AliExpress possui result inválido.');
      }
    }

    const productsPayload = result?.products?.product || result?.products || result?.product || [];
    const products: AliExpressApiProduct[] = Array.isArray(productsPayload)
      ? productsPayload
      : productsPayload
        ? [productsPayload]
        : [];

    const converted: ExternalProduct[] = [];
    for (const item of products) {
      const product = this.convertApiProduct(item, query || category || 'AliExpress');
      if (product) {
        converted.push(product);
        if (converted.length >= safeLimit) break;
      }
    }

    return converted;
  }

  async verifyProduct(externalId: string): Promise<ProductVerificationResult> {
    const id = String(externalId || '').replace(/^ALI/i, '').trim();
    if (!id) {
      return { status: 'NOT_FOUND', reason: 'ID de produto AliExpress ausente' };
    }

    if (!this.hasCredentials()) {
      return {
        status: 'ERROR',
        reason: 'Credenciais do AliExpress não configuradas',
      };
    }

    try {
      const params: Record<string, string> = {
        app_key: process.env.ALIEXPRESS_APP_KEY || '',
        method: 'aliexpress.affiliate.productdetail.get',
        sign_method: 'hmac-sha256',
        format: 'json',
        v: '2.0',
        timestamp: this.formatTimestamp(new Date()),
        product_ids: id,
        ship_to_country: 'BR',
        target_currency: 'BRL',
        target_language: 'PT',
        tracking_id: process.env.ALIEXPRESS_TRACKING_ID || '',
      };
      params.sign = await this.sign(params);

      const response = await fetch(`https://api-sg.aliexpress.com/sync?${new URLSearchParams(params)}`);

      if (response.status === 429 || response.status >= 500) {
        return {
          status: 'ERROR',
          reason: `Falha temporária na API do AliExpress (HTTP ${response.status})`,
        };
      }

      if (!response.ok) {
        return {
          status: 'ERROR',
          reason: `Resposta HTTP ${response.status} da API do AliExpress`,
        };
      }

      const text = await response.text();
      if (!text.startsWith('{') && !text.startsWith('[')) {
        return {
          status: 'ERROR',
          reason: 'Resposta não-JSON da API do AliExpress',
        };
      }

      const payload = JSON.parse(text);
      if (payload.error_response) {
        const err = payload.error_response;
        return {
          status: 'ERROR',
          reason: `Erro da API AliExpress: ${err.msg || err.code || 'desconhecido'}`,
        };
      }

      const responseData = payload.aliexpress_affiliate_productdetail_get_response || payload;
      let result = responseData.resp_result?.result || responseData.result || responseData;
      if (typeof result === 'string') {
        try {
          result = JSON.parse(result);
        } catch {}
      }

      const productsPayload = result?.products?.product || result?.products || result?.product || [];
      const list = Array.isArray(productsPayload) ? productsPayload : [productsPayload];
      const item = list.find((p: any) => String(p.product_id) === id || String(p.product_id) === externalId) || list[0];

      if (!item || !item.product_id) {
        return {
          status: 'NOT_FOUND',
          reason: 'Produto não encontrado na API do AliExpress',
        };
      }

      const converted = this.convertApiProduct(item);
      if (!converted) {
        return {
          status: 'NOT_FOUND',
          reason: 'Produto retornado pelo AliExpress com dados inválidos ou sem estoque',
        };
      }

      return {
        status: 'VERIFIED',
        product: converted,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        status: 'ERROR',
        reason: `Erro de rede/timeout na consulta do AliExpress: ${msg}`,
      };
    }
  }

  async getProduct(externalId: string): Promise<ExternalProduct | null> {
    if (!externalId || externalId.trim().length < 3) return null;
    const verification = await this.verifyProduct(externalId);
    if (verification.status === 'VERIFIED' && verification.product) {
      return verification.product;
    }
    return null;
  }

  async getAvailability(externalId: string): Promise<boolean> {
    const verification = await this.verifyProduct(externalId);
    if (verification.status === 'VERIFIED') return true;
    if (verification.status === 'NOT_FOUND') return false;
    throw new Error(`Falha transitória na API do AliExpress (${verification.reason}). Não marcar como OUT_OF_STOCK.`);
  }

  async getCategories(): Promise<{ id: string; name: string; slug: string }[]> {
    return [];
  }

  async getPrice(externalId: string): Promise<{ price: number; oldPrice?: number } | null> {
    const product = await this.getProduct(externalId);
    return product ? { price: product.price, oldPrice: product.oldPrice } : null;
  }

  async createAffiliateLink(productUrl: string, customTrackingId?: string): Promise<string> {
    if (!productUrl || !productUrl.startsWith('http')) return productUrl;
    try {
      const url = new URL(productUrl);
      const trackingId = process.env.ALIEXPRESS_TRACKING_ID || '';
      if (trackingId) url.searchParams.set('tracking_id', trackingId);
      if (customTrackingId) url.searchParams.set('aff_platform', customTrackingId);
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

  private convertApiProduct(item: AliExpressApiProduct, category?: string): ExternalProduct | null {
    const externalProductId = String(item.product_id || '').trim();
    const name = String(item.product_title || '').trim();
    const originalUrl = String(item.product_detail_url || `https://www.aliexpress.com/item/${externalProductId}.html`).trim();
    const imageUrl = String(item.product_main_image_url || item.image_url || '').trim();
    const price = Number(item.target_sale_price ?? item.sale_price ?? 0);
    const oldPriceRaw = Number(item.target_original_price ?? item.original_price ?? 0);
    const oldPrice = oldPriceRaw > price ? oldPriceRaw : undefined;

    if (!externalProductId || externalProductId.length < 3) return null;
    if (!name || name.length < 5) return null;
    if (!originalUrl || !this.isDirectProductUrl(originalUrl)) return null;
    if (!imageUrl || !imageUrl.startsWith('http')) return null;
    if (!Number.isFinite(price) || price <= 0) return null;

    const discountPercentage = oldPrice && oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : undefined;
    const commissionPercentage = Number(item.commission_rate || process.env.ALIEXPRESS_COMMISSION_PERCENTAGE || 8);
    const reviewCount = Number(item.lastest_volume || 0);
    const rating = Number(item.evaluate_rate || 0);
    const affiliateUrl = item.promotion_link && item.promotion_link.startsWith('http') ? item.promotion_link : originalUrl;

    return {
      externalProductId,
      name,
      description: `${name}. Produto original com envio rápido para o Brasil, garantia e suporte direto no AliExpress.`,
      categoryName: category || 'AliExpress',
      imageUrl,
      images: [imageUrl],
      price,
      oldPrice,
      discountPercentage,
      rating,
      reviewCount,
      salesCount: reviewCount,
      commissionPercentage,
      commissionValue: Math.round(((price * commissionPercentage) / 100) * 100) / 100,
      originalUrl,
      affiliateUrl,
      isAvailable: true,
    };
  }

  private isDirectProductUrl(urlString: string): boolean {
    try {
      const url = new URL(urlString);
      const hostname = url.hostname.toLowerCase();
      if (!hostname.includes('aliexpress.')) return false;
      const pathname = url.pathname.toLowerCase();
      if (
        pathname.includes('/search') ||
        pathname.includes('/category') ||
        pathname.includes('/wholesale') ||
        pathname.includes('/store') ||
        pathname.includes('/shop')
      ) {
        return false;
      }
      return pathname.includes('/item/') || pathname.length > 5;
    } catch {
      return false;
    }
  }

  private async sign(params: Record<string, string>) {
    const secret = process.env.ALIEXPRESS_APP_SECRET || '';
    const content = Object.keys(params)
      .sort()
      .map((key) => `${key}${params[key]}`)
      .join('');

    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(content));
    return Array.from(new Uint8Array(signature))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
  }

  private formatTimestamp(date: Date) {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }
}