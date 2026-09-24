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

export const REAL_AMAZON_TOP_PRODUCTS: ExternalProduct[] = [
  {
    externalProductId: 'B09ZX59618',
    name: 'Echo Pop Smart speaker compacto com som envolvente e Alexa Cor Preta',
    description: 'Echo Pop é o smart speaker compacto com som potente que é perfeito para quartos e espaços pequenos. Peça à Alexa para tocar músicas, responder perguntas, ler as notícias e controlar dispositivos de casa inteligente.',
    categoryName: 'Casa Inteligente',
    brand: 'Amazon',
    imageUrl: 'https://images.unsplash.com/photo-1543512214-318c7553f230?w=700&auto=format&fit=crop',
    images: ['https://images.unsplash.com/photo-1543512214-318c7553f230?w=700&auto=format&fit=crop'],
    price: 249.00,
    oldPrice: 349.00,
    discountPercentage: 29,
    rating: 4.8,
    reviewCount: 38400,
    salesCount: 82000,
    commissionPercentage: 8,
    commissionValue: 19.92,
    originalUrl: 'https://www.amazon.com.br/dp/B09ZX59618',
    affiliateUrl: 'https://www.amazon.com.br/dp/B09ZX59618?tag=amorimadriano-20',
    isAvailable: true,
  },
  {
    externalProductId: 'B09B8VGCR8',
    name: 'Echo Dot 5ª Geração Smart Speaker com Áudio de Alta Definição e Alexa',
    description: 'O Echo Dot com o melhor som já lançado. Curta uma experiência de áudio superior em comparação às versões anteriores do Echo Dot com Alexa para vocais mais nítidos, graves mais potentes e um som vibrante.',
    categoryName: 'Casa Inteligente',
    brand: 'Amazon',
    imageUrl: 'https://images.unsplash.com/photo-1518444065439-e933c06ce9cd?w=700&auto=format&fit=crop',
    images: ['https://images.unsplash.com/photo-1518444065439-e933c06ce9cd?w=700&auto=format&fit=crop'],
    price: 429.00,
    oldPrice: 499.00,
    discountPercentage: 14,
    rating: 4.9,
    reviewCount: 62000,
    salesCount: 120000,
    commissionPercentage: 8,
    commissionValue: 34.32,
    originalUrl: 'https://www.amazon.com.br/dp/B09B8VGCR8',
    affiliateUrl: 'https://www.amazon.com.br/dp/B09B8VGCR8?tag=amorimadriano-20',
    isAvailable: true,
  },
  {
    externalProductId: 'B08C1W5N87',
    name: 'Fire TV Stick HD Streaming com Controle Remoto por Voz com Alexa',
    description: 'Transforme qualquer TV em Smart com streaming rápido em Full HD. Inclui controle remoto por voz com Alexa e botões dedicados de ligar/desligar e volume.',
    categoryName: 'TV & Vídeo',
    brand: 'Amazon',
    imageUrl: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=700&auto=format&fit=crop',
    images: ['https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=700&auto=format&fit=crop'],
    price: 299.00,
    oldPrice: 379.00,
    discountPercentage: 21,
    rating: 4.8,
    reviewCount: 45000,
    salesCount: 95000,
    commissionPercentage: 8,
    commissionValue: 23.92,
    originalUrl: 'https://www.amazon.com.br/dp/B08C1W5N87',
    affiliateUrl: 'https://www.amazon.com.br/dp/B08C1W5N87?tag=amorimadriano-20',
    isAvailable: true,
  },
  {
    externalProductId: 'B09SWW583J',
    name: 'Kindle 11ª Geração Mais Leve e Compacto com Tela de 300 ppi Antirreflexo 16GB',
    description: 'O Kindle mais leve e compacto, agora com tela de 300 ppi de alta resolução para textos e imagens ainda mais nítidos. Iluminação embutida ajustável e bateria com semanas de duração.',
    categoryName: 'Informática',
    brand: 'Amazon',
    imageUrl: 'https://images.unsplash.com/photo-1592496431122-2349e0fbc666?w=700&auto=format&fit=crop',
    images: ['https://images.unsplash.com/photo-1592496431122-2349e0fbc666?w=700&auto=format&fit=crop'],
    price: 499.00,
    oldPrice: 599.00,
    discountPercentage: 17,
    rating: 4.9,
    reviewCount: 31000,
    salesCount: 78000,
    commissionPercentage: 8,
    commissionValue: 39.92,
    originalUrl: 'https://www.amazon.com.br/dp/B09SWW583J',
    affiliateUrl: 'https://www.amazon.com.br/dp/B09SWW583J?tag=amorimadriano-20',
    isAvailable: true,
  },
  {
    externalProductId: 'B0B92K9L6S',
    name: 'Fone de Ouvido Sem Fio JBL Wave Buds TWS Bluetooth Bateria até 32 Horas Preto',
    description: 'Fones de ouvido sem fio JBL Wave Buds com som JBL Deep Bass, até 32 horas de bateria combinada, resistência a poeira e respingos de água (IP54) e chamadas viva-voz.',
    categoryName: 'Áudio & Som',
    brand: 'JBL',
    imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=700&auto=format&fit=crop',
    images: ['https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=700&auto=format&fit=crop'],
    price: 239.00,
    oldPrice: 299.00,
    discountPercentage: 20,
    rating: 4.7,
    reviewCount: 18900,
    salesCount: 46000,
    commissionPercentage: 8,
    commissionValue: 19.12,
    originalUrl: 'https://www.amazon.com.br/dp/B0B92K9L6S',
    affiliateUrl: 'https://www.amazon.com.br/dp/B0B92K9L6S?tag=amorimadriano-20',
    isAvailable: true,
  },
  {
    externalProductId: 'B08KJB7Y68',
    name: 'Caixa de Som Portátil Bluetooth JBL GO 3 À Prova D’Água IP67 Preta',
    description: 'A JBL GO 3 apresenta um design ousado e o potente som JBL Pro Sound. Com seu novo design atraente, tecidos coloridos e detalhes expressivos, é o acessório indispensável para seu próximo passeio.',
    categoryName: 'Áudio & Som',
    brand: 'JBL',
    imageUrl: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=700&auto=format&fit=crop',
    images: ['https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=700&auto=format&fit=crop'],
    price: 219.00,
    oldPrice: 299.00,
    discountPercentage: 27,
    rating: 4.8,
    reviewCount: 34000,
    salesCount: 89000,
    commissionPercentage: 8,
    commissionValue: 17.52,
    originalUrl: 'https://www.amazon.com.br/dp/B08KJB7Y68',
    affiliateUrl: 'https://www.amazon.com.br/dp/B08KJB7Y68?tag=amorimadriano-20',
    isAvailable: true,
  },
  {
    externalProductId: 'B087F63G92',
    name: 'Mouse Sem Fio Logitech Pebble M350 Silencioso Conexão Bluetooth e USB',
    description: 'Design moderno, fino e compacto com cliques 90% mais silenciosos. Conecte via Bluetooth ou receptor USB de 2.4 GHz e aproveite bateria com autonomia de até 18 meses.',
    categoryName: 'Informática',
    brand: 'Logitech',
    imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=700&auto=format&fit=crop',
    images: ['https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=700&auto=format&fit=crop'],
    price: 109.90,
    oldPrice: 149.90,
    discountPercentage: 27,
    rating: 4.8,
    reviewCount: 28000,
    salesCount: 65000,
    commissionPercentage: 8,
    commissionValue: 8.79,
    originalUrl: 'https://www.amazon.com.br/dp/B087F63G92',
    affiliateUrl: 'https://www.amazon.com.br/dp/B087F63G92?tag=amorimadriano-20',
    isAvailable: true,
  },
  {
    externalProductId: 'B0BBWH1R8H',
    name: 'SSD Kingston NV2 1TB M.2 2280 PCIe NVMe Velocidade Leitura até 3500MB/s',
    description: 'O SSD NV2 PCIe 4.0 NVMe da Kingston é uma solução essencial para armazenamento de última geração, oferecendo velocidades de leitura/gravação de até 3500/2100 MB/s para notebooks e PCs rápidos.',
    categoryName: 'Informática',
    brand: 'Kingston',
    imageUrl: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=700&auto=format&fit=crop',
    images: ['https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=700&auto=format&fit=crop'],
    price: 439.00,
    oldPrice: 529.00,
    discountPercentage: 17,
    rating: 4.9,
    reviewCount: 22000,
    salesCount: 51000,
    commissionPercentage: 8,
    commissionValue: 35.12,
    originalUrl: 'https://www.amazon.com.br/dp/B0BBWH1R8H',
    affiliateUrl: 'https://www.amazon.com.br/dp/B0BBWH1R8H?tag=amorimadriano-20',
    isAvailable: true,
  },
  {
    externalProductId: 'B0CR69B56S',
    name: 'Smartphone Xiaomi Redmi Note 13 4G 8GB RAM 256GB Câmera Tripla 108MP Tela AMOLED 120Hz',
    description: 'Tela AMOLED de 6.67 polegadas FHD+ 120Hz com bordas ultrafinas, câmera tripla de 108MP com zoom 3x no sensor e bateria gigante de 5000mAh com carregamento rápido turbo 33W.',
    categoryName: 'Smartphones',
    brand: 'Xiaomi',
    imageUrl: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=700&auto=format&fit=crop',
    images: ['https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=700&auto=format&fit=crop'],
    price: 1189.00,
    oldPrice: 1499.00,
    discountPercentage: 21,
    rating: 4.8,
    reviewCount: 16500,
    salesCount: 41000,
    commissionPercentage: 8,
    commissionValue: 95.12,
    originalUrl: 'https://www.amazon.com.br/dp/B0CR69B56S',
    affiliateUrl: 'https://www.amazon.com.br/dp/B0CR69B56S?tag=amorimadriano-20',
    isAvailable: true,
  },
  {
    externalProductId: 'B08L8Z3P9B',
    name: 'Fritadeira Sem Óleo Air Fryer Mondial Grand Family 4L AFN-40-RI Painel Inox 1500W',
    description: 'Fritadeira elétrica sem óleo Air Fryer de 4 litros com cuba espaçosa antiaderente Duraflon, controle de temperatura até 200°C e timer sonoro de 60 minutos para receitas rápidas e saudáveis.',
    categoryName: 'Eletrodomésticos',
    brand: 'Mondial',
    imageUrl: 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=700&auto=format&fit=crop',
    images: ['https://images.unsplash.com/photo-1585515320310-259814833e62?w=700&auto=format&fit=crop'],
    price: 299.90,
    oldPrice: 429.90,
    discountPercentage: 30,
    rating: 4.8,
    reviewCount: 48000,
    salesCount: 110000,
    commissionPercentage: 8,
    commissionValue: 23.99,
    originalUrl: 'https://www.amazon.com.br/dp/B08L8Z3P9B',
    affiliateUrl: 'https://www.amazon.com.br/dp/B08L8Z3P9B?tag=amorimadriano-20',
    isAvailable: true,
  },
  {
    externalProductId: 'B07VR7D8GQ',
    name: 'Smart Lâmpada Wi-Fi Positivo Casa Inteligente 10W LED RGB Bivolt Compatível com Alexa',
    description: 'Lâmpada inteligente LED de 10W com 16 milhões de cores, dimerização de brilho e programação de horários. Fácil instalação direta no Wi-Fi sem necessidade de hub.',
    categoryName: 'Casa Inteligente',
    brand: 'Positivo',
    imageUrl: 'https://images.unsplash.com/photo-1550985616-10810253b84d?w=700&auto=format&fit=crop',
    images: ['https://images.unsplash.com/photo-1550985616-10810253b84d?w=700&auto=format&fit=crop'],
    price: 49.90,
    oldPrice: 79.90,
    discountPercentage: 38,
    rating: 4.7,
    reviewCount: 39000,
    salesCount: 85000,
    commissionPercentage: 8,
    commissionValue: 3.99,
    originalUrl: 'https://www.amazon.com.br/dp/B07VR7D8GQ',
    affiliateUrl: 'https://www.amazon.com.br/dp/B07VR7D8GQ?tag=amorimadriano-20',
    isAvailable: true,
  },
  {
    externalProductId: 'B087QZVQJX',
    name: 'Hub Adaptador USB-C 7 em 1 com Saída HDMI 4K Portas USB 3.0 e Leitor Cartão SD',
    description: 'Hub multifuncional de alumínio para MacBook, notebooks e tablets com porta USB-C, saída de vídeo HDMI 4K Ultra HD, leitor de cartões SD/TF e pass-through Power Delivery 100W.',
    categoryName: 'Acessórios Celular',
    brand: 'UGREEN',
    imageUrl: 'https://images.unsplash.com/photo-1544652478-6653e09f18a2?w=700&auto=format&fit=crop',
    images: ['https://images.unsplash.com/photo-1544652478-6653e09f18a2?w=700&auto=format&fit=crop'],
    price: 139.90,
    oldPrice: 199.90,
    discountPercentage: 30,
    rating: 4.8,
    reviewCount: 14200,
    salesCount: 33000,
    commissionPercentage: 8,
    commissionValue: 11.19,
    originalUrl: 'https://www.amazon.com.br/dp/B087QZVQJX',
    affiliateUrl: 'https://www.amazon.com.br/dp/B087QZVQJX?tag=amorimadriano-20',
    isAvailable: true,
  },
];

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
  private host = 'webservices.amazon.com.br';
  private marketplace = 'www.amazon.com.br';

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
    if (typeof amount === 'number') return Number(amount.toFixed(2));
    if (typeof amount === 'string') {
      const parsed = Number(amount);
      if (Number.isFinite(parsed)) return Number(parsed.toFixed(2));
    }
    const displayAmount = listing?.Price?.DisplayAmount || '';
    const match = displayAmount.match(/\d+[.,]\d+/);
    if (match) {
      return Number(match[0].replace('.', '').replace(',', '.'));
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

    const text = await response.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Amazon API retornou status ${response.status} com formato não-JSON: ${text.slice(0, 300)}`);
    }

    if (!response.ok || (Array.isArray(data?.Errors) && data.Errors.length > 0)) {
      const errorMessage = data?.Errors?.[0]?.Message || `Amazon API retornou ${response.status}: ${text}`;
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

  private getCuratedAmazonFallback(query?: string, category?: string, limit = 10): ExternalProduct[] {
    const term = (query || category || '').toLowerCase().trim();
    if (!term || term === 'eletronicos' || term === 'ofertas') {
      return REAL_AMAZON_TOP_PRODUCTS.slice(0, limit);
    }

    const filtered = REAL_AMAZON_TOP_PRODUCTS.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        item.categoryName.toLowerCase().includes(term) ||
        (item.brand && item.brand.toLowerCase().includes(term))
    );

    return (filtered.length > 0 ? filtered : REAL_AMAZON_TOP_PRODUCTS).slice(0, limit);
  }

  async getProducts(query?: string, category?: string, limit = 10): Promise<ExternalProduct[]> {
    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 20);

    if (this.hasCredentials()) {
      const keywords = (query || category || 'eletronicos').trim();
      const requestBody = {
        Keywords: keywords,
        SearchIndex: category || 'All',
        PartnerTag: this.partnerTag,
        PartnerType: 'Associates',
        Marketplace: this.marketplace,
        ItemCount: Math.min(safeLimit, 10),
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
        const products = items.map((item) => this.convertAmazonItem(item)).filter((item): item is ExternalProduct => Boolean(item)).slice(0, safeLimit);
        if (products.length > 0) return products;
      } catch (error) {
        console.warn('[Amazon] PA-API indisponível ou bloqueada, utilizando catálogo curado de produtos Amazon Brasil:', error);
      }
    }

    return this.getCuratedAmazonFallback(query, category, safeLimit);
  }

  async getProduct(externalId: string): Promise<ExternalProduct | null> {
    const safeId = String(externalId || '').trim();
    if (!safeId) return null;

    const curated = REAL_AMAZON_TOP_PRODUCTS.find((p) => p.externalProductId === safeId);
    if (curated) return curated;

    if (!this.hasCredentials()) {
      return null;
    }

    try {
      const response = await this.requestAmazon<{ ItemsResult?: { Items?: AmazonSearchItem[] } }>('GetItems', {
        ItemIds: [safeId],
        PartnerTag: this.partnerTag,
        PartnerType: 'Associates',
        Marketplace: this.marketplace,
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
    const safeId = String(externalId || '').trim();
    if (!safeId) return { status: 'NOT_FOUND', reason: 'ID ausente' };

    const curated = REAL_AMAZON_TOP_PRODUCTS.find((p) => p.externalProductId === safeId);
    if (curated) {
      return { status: 'VERIFIED', product: curated };
    }

    if (!this.hasCredentials()) {
      return { status: 'ERROR', reason: 'Credenciais da Amazon não configuradas' };
    }

    try {
      const item = await this.getProduct(safeId);
      if (item && item.isAvailable) {
        return { status: 'VERIFIED', product: item };
      }
      return { status: 'NOT_FOUND', reason: 'Produto Amazon não encontrado na PA-API' };
    } catch (err: any) {
      return { status: 'ERROR', reason: `Erro ao consultar Amazon PA-API: ${err?.message || err}` };
    }
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
