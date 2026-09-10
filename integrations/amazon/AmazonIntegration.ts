import { MarketplaceIntegration, ProductVerificationResult } from '../MarketplaceIntegration';
import { ExternalProduct } from '../../types';

type AmazonSearchItem = {
  ASIN?: string;
  DetailPageURL?: string;
  Images?: {
    Primary?: {
      Large?: { URL?: string };
    };
    Variants?: Array<{
      Large?: { URL?: string };
    }>;
  };
  ItemInfo?: {
    Title?: { DisplayValue?: string };
    ByLineInfo?: {
      Brand?: { DisplayValue?: string };
      Manufacturer?: { DisplayValue?: string };
    };
    Features?: { DisplayValues?: string[] };
    ContentInfo?: { Features?: { DisplayValues?: string[] } };
  };
  Offers?: {
    Listings?: Array<{
      Price?: {
        Amount?: number | string;
        Currency?: string;
        DisplayAmount?: string;
      };
      Availability?: { Message?: string };
    }>;
  };
  CustomerReviews?: {
    Count?: number;
    Rating?: number;
  };
};

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function hmacSha256(key: ArrayBuffer | Uint8Array | string, value: string): Promise<ArrayBuffer> {
  const bytes = typeof key === 'string'
    ? new TextEncoder().encode(key)
    : key instanceof Uint8Array
      ? key
      : new Uint8Array(key);

  const normalized = new Uint8Array(new ArrayBuffer(bytes.length));
  normalized.set(bytes);

  return crypto.subtle.importKey('raw', normalized, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']).then((cryptoKey) =>
    crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(value))
  );
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export class AmazonIntegration implements MarketplaceIntegration {
  marketplaceSlug = 'amazon';
  marketplaceName = 'Amazon';

  private partnerTag = process.env.AMAZON_ASSOCIATE_TAG || process.env.AMAZON_AFFILIATE_TAG || process.env.AFFILIATE_TAG || 'vendasemestoque-20';
  private accessKey = process.env.AMAZON_ACCESS_KEY;
  private secretKey = process.env.AMAZON_SECRET_KEY;
  private region = 'us-east-1';
  private host = 'webservices.amazon.com';

  private hasCredentials(): boolean {
    return Boolean(this.accessKey && this.secretKey && this.partnerTag);
  }

  private extractImageUrl(item: AmazonSearchItem): string | null {
    const large = item.Images?.Primary?.Large?.URL || item.Images?.Variants?.[0]?.Large?.URL;
    if (large && /^https?:\/\//i.test(large)) return large;
    return null;
  }

  private extractPrice(item: AmazonSearchItem): number {
    const listing = item.Offers?.Listings?.[0];
    const amount = listing?.Price?.Amount;
    if (typeof amount === 'number') return Number((amount / 100).toFixed(2));
    if (typeof amount === 'string') {
      const parsed = Number(amount);
      if (Number.isFinite(parsed)) return Number((parsed / 100).toFixed(2));
    }
    const displayAmount = listing?.Price?.DisplayAmount || '';
    const match = displayAmount.match(/\d+[.,]\d+/);
    if (match) {
      return Number(match[0].replace('.', '').replace(',', '.')) / 100;
    }
    return 0;
  }

  private extractAvailability(item: AmazonSearchItem): boolean {
    const message = item.Offers?.Listings?.[0]?.Availability?.Message?.toLowerCase() || '';
    if (!message) return Boolean(item.Offers?.Listings?.length);
    return !/(out of stock|currently unavailable|unavailable|indisponível|indisponivel|esgotado)/i.test(message);
  }

  private extractTitle(item: AmazonSearchItem): string {
    return item.ItemInfo?.Title?.DisplayValue || 'Produto Amazon';
  }

  private extractBrand(item: AmazonSearchItem): string | undefined {
    return item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue || item.ItemInfo?.ByLineInfo?.Manufacturer?.DisplayValue || undefined;
  }

  private extractDescription(item: AmazonSearchItem): string {
    const title = this.extractTitle(item);
    const features = item.ItemInfo?.Features?.DisplayValues || item.ItemInfo?.ContentInfo?.Features?.DisplayValues || [];
    const description = features.join('. ');
    return description ? `${title}. ${description}` : `${title}. Produto disponível na Amazon.`;
  }

  private buildAmazonUrl(productUrl: string, customTrackingId?: string): string {
    const url = new URL(productUrl.startsWith('http') ? productUrl : `https://${productUrl}`);
    url.searchParams.set('tag', this.partnerTag);
    if (customTrackingId) {
      url.searchParams.set('ascsubtag', customTrackingId);
    }
    return url.toString();
  }

  private async signAmazonRequest(body: Record<string, unknown>, target: string): Promise<{ headers: Headers; payload: string }> {
    if (!this.accessKey || !this.secretKey) {
      throw new Error('Credenciais da Amazon não configuradas.');
    }

    const method = 'POST';
    const endpoint = `https://${this.host}/paapi5/${target.toLowerCase()}`;
    const payload = JSON.stringify(body);
    const amzDate = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const dateStamp = amzDate.slice(0, 8);
    const headers = new Headers({
      'content-type': 'application/json; charset=utf-8',
      'host': this.host,
      'x-amz-date': amzDate,
      'x-amz-target': `com.amazon.paapi5.v1.ProductAdvertisingAPIv1.${target}`,
    });

    const canonicalUri = `/paapi5/${target.toLowerCase()}`;
    const canonicalQueryString = '';
    const signedHeaders = 'content-type;host;x-amz-date;x-amz-target';
    const payloadHash = await sha256Hex(payload);
    const canonicalRequest = [
      method,
      canonicalUri,
      canonicalQueryString,
      `content-type:application/json; charset=utf-8\nhost:${this.host}\nx-amz-date:${amzDate}\nx-amz-target:com.amazon.paapi5.v1.ProductAdvertisingAPIv1.${target}\n`,
      signedHeaders,
      payloadHash,
    ].join('\n');

    const credentialScope = `${dateStamp}/${this.region}/ProductAdvertisingAPI/aws4_request`;
    const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, await sha256Hex(canonicalRequest)].join('\n');

    const kDate = await hmacSha256(`AWS4${this.secretKey}`, dateStamp);
    const kRegion = await hmacSha256(kDate, this.region);
    const kService = await hmacSha256(kRegion, 'ProductAdvertisingAPI');
    const kSigning = await hmacSha256(kService, 'aws4_request');
    const signature = toHex(await hmacSha256(kSigning, stringToSign));

    headers.set('Authorization', `AWS4-HMAC-SHA256 Credential=${this.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`);

    return {
      headers,
      payload,
    };
  }

  private async requestAmazon<T>(target: string, body: Record<string, unknown>): Promise<T> {
    const { headers, payload } = await this.signAmazonRequest(body, target);
    const response = await fetch(`https://${this.host}/paapi5/${target.toLowerCase()}`, {
      method: 'POST',
      headers,
      body: payload,
    });

    const data = await response.json() as T & { Errors?: Array<{ Code?: string; Message?: string }> };
    if (!response.ok || (Array.isArray((data as any)?.Errors) && (data as any).Errors.length > 0)) {
      const errorMessage = (data as any)?.Errors?.[0]?.Message || `Amazon API retornou ${response.status}`;
      throw new Error(errorMessage);
    }

    return data;
  }

  private convertAmazonItem(item: AmazonSearchItem): ExternalProduct | null {
    const asin = item.ASIN;
    const title = this.extractTitle(item);
    const imageUrl = this.extractImageUrl(item);
    const detailPageUrl = item.DetailPageURL || '';
    const price = this.extractPrice(item);
    const isAvailable = this.extractAvailability(item);

    if (!asin || !detailPageUrl || !imageUrl || price <= 0 || !isAvailable) {
      return null;
    }

    const commissionPercentage = Number(process.env.AMAZON_COMMISSION_PERCENTAGE || 8);
    const rating = Number(item.CustomerReviews?.Rating || 4.6);
    const reviewCount = Number(item.CustomerReviews?.Count || 0);
    const description = this.extractDescription(item);

    return {
      externalProductId: asin,
      name: title,
      description,
      categoryName: 'Amazon',
      brand: this.extractBrand(item),
      imageUrl,
      images: [imageUrl],
      price,
      rating,
      reviewCount,
      salesCount: reviewCount || undefined,
      commissionPercentage,
      commissionValue: Number(((price * commissionPercentage) / 100).toFixed(2)),
      originalUrl: detailPageUrl,
      affiliateUrl: this.buildAmazonUrl(detailPageUrl),
      isAvailable,
    };
  }

  async getProducts(query?: string, category?: string, limit = 10): Promise<ExternalProduct[]> {
    if (!this.hasCredentials()) {
      console.warn('[Amazon] Credenciais ausentes; nenhum produto Amazon será exibido.');
      return [];
    }

    const keywords = (query || category || 'eletronicos').trim();
    const requestBody = {
      Keywords: keywords,
      SearchIndex: category || 'All',
      PartnerTag: this.partnerTag,
      PartnerType: 'Associates',
      ItemCount: Math.min(Math.max(Number(limit) || 10, 1), 10),
      Resources: [
        'Images.Primary.Large',
        'ItemInfo.ByLineInfo',
        'ItemInfo.ContentInfo',
        'ItemInfo.Title',
        'Offers.Listings.Price',
        'Offers.Listings.Availability',
      ],
    };

    try {
      const response = await this.requestAmazon<{ SearchResult?: { Items?: AmazonSearchItem[] } }>('SearchItems', requestBody);
      const items = response.SearchResult?.Items || [];
      return items.map((item) => this.convertAmazonItem(item)).filter((item): item is ExternalProduct => Boolean(item)).slice(0, Number(limit) || 10);
    } catch (error) {
      console.warn('[Amazon] Erro ao buscar produtos:', error);
      // Não publique dados curados como se fossem ofertas verificadas da Amazon.
      return [];
    }
  }

  private getCuratedAmazonFallback(limit = 10): ExternalProduct[] {
    const curatedProducts: ExternalProduct[] = [
      {
        externalProductId: 'B0DCWRK79D',
        name: 'Apple AirPods Pro (2ª Geração) com Estojo de Carregamento MagSafe',
        description: 'Fones de ouvido Bluetooth com cancelamento ativo de ruído, modo transparência e até 6 horas de duração de bateria. Com carcaça de carregamento sem fio, até 30 horas de duração total da bateria.',
        categoryName: 'Amazon',
        brand: 'Apple',
        imageUrl: 'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=700&auto=format&fit=crop',
        images: ['https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=700&auto=format&fit=crop'],
        price: 1899.00,
        oldPrice: 2199.00,
        discountPercentage: 13,
        rating: 4.8,
        reviewCount: 1250,
        salesCount: 850,
        commissionPercentage: 8,
        commissionValue: 151.92,
        originalUrl: 'https://www.amazon.com.br/s?k=Apple+AirPods+Pro+2',
        affiliateUrl: this.buildAmazonUrl('https://www.amazon.com.br/s?k=Apple+AirPods+Pro+2'),
        isAvailable: true,
      },
      {
        externalProductId: 'B0C7G9SY4D',
        name: 'Samsung Galaxy Buds2 Pro - Fones Bluetooth com Cancelamento de Ruído',
        description: 'Fones de ouvido Bluetooth Samsung Galaxy Buds2 Pro com cancelamento ativo de ruído (ANC), IPX7 à prova de água e até 5 horas de duração de bateria por carga.',
        categoryName: 'Amazon',
        brand: 'Samsung',
        imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=700&auto=format&fit=crop',
        images: ['https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=700&auto=format&fit=crop'],
        price: 849.00,
        oldPrice: 1099.00,
        discountPercentage: 23,
        rating: 4.6,
        reviewCount: 742,
        salesCount: 520,
        commissionPercentage: 8,
        commissionValue: 67.92,
        originalUrl: 'https://www.amazon.com.br/s?k=Samsung+Galaxy+Buds2+Pro',
        affiliateUrl: this.buildAmazonUrl('https://www.amazon.com.br/s?k=Samsung+Galaxy+Buds2+Pro'),
        isAvailable: true,
      },
      {
        externalProductId: 'B0BF4DHPQM',
        name: 'Kindle Paperwhite (11ª Geração) - E-reader com Tela de 6.8" e Wi-Fi',
        description: 'E-reader Kindle com tela retina de alta resolução, luz ajustável, bateria que dura semanas e acesso a milhões de livros.',
        categoryName: 'Amazon',
        brand: 'Amazon',
        imageUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=700&auto=format&fit=crop',
        images: ['https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=700&auto=format&fit=crop'],
        price: 599.00,
        oldPrice: 799.00,
        discountPercentage: 25,
        rating: 4.7,
        reviewCount: 1680,
        salesCount: 2100,
        commissionPercentage: 6,
        commissionValue: 35.94,
        originalUrl: 'https://www.amazon.com.br/s?k=Kindle+Paperwhite+11+geracao',
        affiliateUrl: this.buildAmazonUrl('https://www.amazon.com.br/s?k=Kindle+Paperwhite+11+geracao'),
        isAvailable: true,
      },
      {
        externalProductId: 'B0CQQQ6ZQZ',
        name: 'Echo Dot (5ª Geração) - Alto-falante Inteligente com Alexa',
        description: 'Assistente inteligente Echo Dot com som melhorado, temperatura ambiente visível na frente, configuração de movimento, reconhecimento de voz Alexa.',
        categoryName: 'Amazon',
        brand: 'Amazon',
        imageUrl: 'https://images.unsplash.com/photo-1558089687-f282ffcbc126?w=700&auto=format&fit=crop',
        images: ['https://images.unsplash.com/photo-1558089687-f282ffcbc126?w=700&auto=format&fit=crop'],
        price: 279.00,
        oldPrice: 399.00,
        discountPercentage: 30,
        rating: 4.5,
        reviewCount: 3420,
        salesCount: 5200,
        commissionPercentage: 7,
        commissionValue: 19.53,
        originalUrl: 'https://www.amazon.com.br/s?k=Echo+Dot+5+geracao',
        affiliateUrl: this.buildAmazonUrl('https://www.amazon.com.br/s?k=Echo+Dot+5+geracao'),
        isAvailable: true,
      },
    ];

    return curatedProducts.slice(0, limit);
  }

  async getProduct(externalId: string): Promise<ExternalProduct | null> {
    if (!this.hasCredentials()) {
      return null;
    }

    const safeId = String(externalId || '').trim();
    if (!safeId) return null;

    try {
      const response = await this.requestAmazon<{ ItemsResult?: { Items?: AmazonSearchItem[] } }>('GetItems', {
        ItemIds: [safeId],
        PartnerTag: this.partnerTag,
        PartnerType: 'Associates',
        Resources: [
          'Images.Primary.Large',
          'ItemInfo.ByLineInfo',
          'ItemInfo.ContentInfo',
          'ItemInfo.Title',
          'Offers.Listings.Price',
          'Offers.Listings.Availability',
        ],
      });
      const item = response.ItemsResult?.Items?.[0];
      if (!item) return null;
      return this.convertAmazonItem(item);
    } catch (error) {
      console.warn('[Amazon] Erro ao buscar item específico:', error);
      return null;
    }
  }

  async verifyProduct(externalId: string): Promise<ProductVerificationResult> {
    const item = await this.getProduct(externalId);
    if (!item) {
      return { status: 'NOT_FOUND', reason: 'Produto Amazon não encontrado ou indisponível' };
    }
    return { status: 'VERIFIED', product: item };
  }

  async getCategories(): Promise<{ id: string; name: string; slug: string }[]> {
    return [];
  }

  async getPrice(externalId: string): Promise<{ price: number; oldPrice?: number } | null> {
    const product = await this.getProduct(externalId);
    if (!product) return null;
    return { price: product.price, oldPrice: product.oldPrice };
  }

  async getAvailability(externalId: string): Promise<boolean> {
    const product = await this.getProduct(externalId);
    return Boolean(product?.isAvailable);
  }

  async createAffiliateLink(productUrl: string, customTrackingId?: string): Promise<string> {
    if (!productUrl || !productUrl.startsWith('http')) return productUrl;
    return this.buildAmazonUrl(productUrl, customTrackingId);
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
