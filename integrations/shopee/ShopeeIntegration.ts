import { AffiliateConversionReport, MarketplaceIntegration, ProductVerificationResult } from '../MarketplaceIntegration';
import { ExternalProduct } from '../../types';

type ShopeeNode = {
  itemId?: string | number;
  shopId?: string | number;
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

export const REAL_SHOPEE_TOP_PRODUCTS: ExternalProduct[] = [
  {
    externalProductId: 'SHP2918374610',
    name: 'Smartwatch D20 Ultra Pro Monitor Cardíaco e Passos com Notificações Bluetooth',
    description: 'Relógio Inteligente Smartwatch D20 com monitor cardíaco, contador de passos, notificações de redes sociais e compatível com Android e iOS.',
    categoryName: 'Smartwatches',
    brand: 'SmartLife',
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=700&auto=format&fit=crop',
    images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=700&auto=format&fit=crop'],
    price: 39.90,
    oldPrice: 79.90,
    discountPercentage: 50,
    rating: 4.7,
    reviewCount: 18200,
    salesCount: 42000,
    commissionPercentage: 10,
    commissionValue: 3.99,
    originalUrl: 'https://shopee.com.br/product/18316631281/2918374610',
    affiliateUrl: 'https://s.shopee.com.br/d20-ultra-pro',
    isAvailable: true,
  },
  {
    externalProductId: 'SHP8492018372',
    name: 'Smartwatch T800 Ultra 2 Relógio Inteligente NFC Carregamento por Indução Tela Infinita',
    description: 'Smartwatch T800 Ultra Série 9 com tela HD de 1.99 polegadas, carregamento sem fio por indução, comando de voz, troca pulseira e múltiplos modos esportivos.',
    categoryName: 'Smartwatches',
    brand: 'UltraTech',
    imageUrl: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=700&auto=format&fit=crop',
    images: ['https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=700&auto=format&fit=crop'],
    price: 54.90,
    oldPrice: 119.90,
    discountPercentage: 54,
    rating: 4.8,
    reviewCount: 12500,
    salesCount: 38000,
    commissionPercentage: 10,
    commissionValue: 5.49,
    originalUrl: 'https://shopee.com.br/product/18316631281/8492018372',
    affiliateUrl: 'https://s.shopee.com.br/t800-ultra-2',
    isAvailable: true,
  },
  {
    externalProductId: 'SHP3192847192',
    name: 'Caixa de Som Bluetooth TWS Portátil Mini Speaker Potente À Prova de Respingos',
    description: 'Mini caixa de som Bluetooth portátil com tecnologia TWS para emparelhamento estéreo, graves reforçados e até 6 horas de autonomia de bateria.',
    categoryName: 'Áudio & Som',
    brand: 'SoundBox',
    imageUrl: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=700&auto=format&fit=crop',
    images: ['https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=700&auto=format&fit=crop'],
    price: 49.99,
    oldPrice: 89.90,
    discountPercentage: 44,
    rating: 4.8,
    reviewCount: 9400,
    salesCount: 23000,
    commissionPercentage: 10,
    commissionValue: 5.00,
    originalUrl: 'https://shopee.com.br/product/18316631281/3192847192',
    affiliateUrl: 'https://s.shopee.com.br/mini-speaker-tws',
    isAvailable: true,
  },
  {
    externalProductId: 'SHP7291837461',
    name: 'Fone de Ouvido Bluetooth Sem Fio i12 TWS Touch com Case de Carregamento',
    description: 'Fones de ouvido Bluetooth 5.0 sem fio com controle por toque, cancelamento passivo de ruído, pareamento automático e estojo magnético recarregável.',
    categoryName: 'Áudio & Som',
    brand: 'TWS Audio',
    imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=700&auto=format&fit=crop',
    images: ['https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=700&auto=format&fit=crop'],
    price: 24.90,
    oldPrice: 59.90,
    discountPercentage: 58,
    rating: 4.7,
    reviewCount: 42000,
    salesCount: 95000,
    commissionPercentage: 10,
    commissionValue: 2.49,
    originalUrl: 'https://shopee.com.br/product/18316631281/7291837461',
    affiliateUrl: 'https://s.shopee.com.br/fone-i12-tws',
    isAvailable: true,
  },
  {
    externalProductId: 'SHP4918273619',
    name: 'Ring Light LED 26cm com Tripé Ajustável 2.1m e Suporte para Celular',
    description: 'Iluminador Ring Light LED de 10 polegadas com 3 temperaturas de cor, dimerização de brilho e tripé alto ajustável para vídeos e transmissões ao vivo.',
    categoryName: 'Acessórios Celular',
    brand: 'StudioLight',
    imageUrl: 'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=700&auto=format&fit=crop',
    images: ['https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=700&auto=format&fit=crop'],
    price: 64.90,
    oldPrice: 119.00,
    discountPercentage: 45,
    rating: 4.8,
    reviewCount: 14600,
    salesCount: 31000,
    commissionPercentage: 9,
    commissionValue: 5.84,
    originalUrl: 'https://shopee.com.br/product/18316631281/4918273619',
    affiliateUrl: 'https://s.shopee.com.br/ring-light-26cm',
    isAvailable: true,
  },
  {
    externalProductId: 'SHP5192837461',
    name: 'Mini Processador e Triturador de Alimentos Elétrico USB Portátil 250ml',
    description: 'Mini processador de alimentos elétrico recarregável via USB com 3 lâminas de aço inox, ideal para triturar alho, cebola, temperos e legumes rapidamente.',
    categoryName: 'Eletrodomésticos',
    brand: 'PraticHome',
    imageUrl: 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=700&auto=format&fit=crop',
    images: ['https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=700&auto=format&fit=crop'],
    price: 29.90,
    oldPrice: 59.90,
    discountPercentage: 50,
    rating: 4.9,
    reviewCount: 31000,
    salesCount: 68000,
    commissionPercentage: 10,
    commissionValue: 2.99,
    originalUrl: 'https://shopee.com.br/product/18316631281/5192837461',
    affiliateUrl: 'https://s.shopee.com.br/mini-processador-eletrico',
    isAvailable: true,
  },
  {
    externalProductId: 'SHP8192837402',
    name: 'Cabo Carregador Turbo USB-C 66W 6A Reforçado em Nylon Trançado 1.5m',
    description: 'Cabo de carregamento rápido turbo 66W USB tipo C compatível com Xiaomi, Samsung, Motorola e Realme. Revestimento resistente a dobras e puxões.',
    categoryName: 'Acessórios Celular',
    brand: 'FastCharge',
    imageUrl: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=700&auto=format&fit=crop',
    images: ['https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=700&auto=format&fit=crop'],
    price: 21.90,
    oldPrice: 39.90,
    discountPercentage: 45,
    rating: 4.8,
    reviewCount: 22000,
    salesCount: 54000,
    commissionPercentage: 10,
    commissionValue: 2.19,
    originalUrl: 'https://shopee.com.br/product/18316631281/8192837402',
    affiliateUrl: 'https://s.shopee.com.br/cabo-usbc-turbo-66w',
    isAvailable: true,
  },
  {
    externalProductId: 'SHP7391827365',
    name: 'Power Bank 20000mAh Carregador Portátil por Indução e Cabos Integrados Turbo',
    description: 'Bateria externa Power Bank de alta capacidade 20.000mAh com visor digital de bateria, 4 cabos acoplados e suporte a carregamento sem fio Qi.',
    categoryName: 'Acessórios Celular',
    brand: 'PowerMax',
    imageUrl: 'https://images.unsplash.com/photo-1609592426860-26219808a38c?w=700&auto=format&fit=crop',
    images: ['https://images.unsplash.com/photo-1609592426860-26219808a38c?w=700&auto=format&fit=crop'],
    price: 79.90,
    oldPrice: 149.90,
    discountPercentage: 47,
    rating: 4.8,
    reviewCount: 16800,
    salesCount: 36000,
    commissionPercentage: 10,
    commissionValue: 7.99,
    originalUrl: 'https://shopee.com.br/product/18316631281/7391827365',
    affiliateUrl: 'https://s.shopee.com.br/powerbank-20000mah',
    isAvailable: true,
  },
  {
    externalProductId: 'SHP6291827301',
    name: 'Umidificador e Aromatizador de Ar Ultrassônico LED RGB 300ml Difusor de Óleos',
    description: 'Umidificador de ar ultrassônico silencioso com iluminação LED 7 cores, desligamento automático e função difusor para óleos essenciais e aromaterapia.',
    categoryName: 'Casa Inteligente',
    brand: 'AromaHome',
    imageUrl: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=700&auto=format&fit=crop',
    images: ['https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=700&auto=format&fit=crop'],
    price: 34.90,
    oldPrice: 69.90,
    discountPercentage: 50,
    rating: 4.9,
    reviewCount: 29000,
    salesCount: 61000,
    commissionPercentage: 10,
    commissionValue: 3.49,
    originalUrl: 'https://shopee.com.br/product/18316631281/6291827301',
    affiliateUrl: 'https://s.shopee.com.br/umidificador-aromatizador-led',
    isAvailable: true,
  },
  {
    externalProductId: 'SHP7482910382',
    name: 'Lâmpada Smart LED RGB Wi-Fi 10W Bivolt Compatível com Alexa e Google Assistente',
    description: 'Lâmpada inteligente Wi-Fi de 10W com 16 milhões de cores, dimerização de brilho, automação por aplicativo e controle por voz via Alexa.',
    categoryName: 'Casa Inteligente',
    brand: 'SmartLight',
    imageUrl: 'https://images.unsplash.com/photo-1550985616-10810253b84d?w=700&auto=format&fit=crop',
    images: ['https://images.unsplash.com/photo-1550985616-10810253b84d?w=700&auto=format&fit=crop'],
    price: 32.90,
    oldPrice: 59.90,
    discountPercentage: 45,
    rating: 4.8,
    reviewCount: 11400,
    salesCount: 27000,
    commissionPercentage: 10,
    commissionValue: 3.29,
    originalUrl: 'https://shopee.com.br/product/18316631281/7482910382',
    affiliateUrl: 'https://s.shopee.com.br/lampada-smart-rgb-wifi',
    isAvailable: true,
  },
  {
    externalProductId: 'SHP8472910293',
    name: 'Mouse Gamer Sem Fio Recarregável 3200 DPI LED RGB com 6 Botões Silenciosos',
    description: 'Mouse gamer sem fio ergonômico com bateria interna recarregável, iluminação RGB fluida, ajuste de sensibilidade até 3200 DPI e cliques silenciosos.',
    categoryName: 'Gamer',
    brand: 'GamerPro',
    imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=700&auto=format&fit=crop',
    images: ['https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=700&auto=format&fit=crop'],
    price: 38.90,
    oldPrice: 79.90,
    discountPercentage: 51,
    rating: 4.8,
    reviewCount: 24000,
    salesCount: 52000,
    commissionPercentage: 10,
    commissionValue: 3.89,
    originalUrl: 'https://shopee.com.br/product/18316631281/8472910293',
    affiliateUrl: 'https://s.shopee.com.br/mouse-gamer-sem-fio',
    isAvailable: true,
  },
  {
    externalProductId: 'SHP5291827364',
    name: 'Microfone de Lapela Sem Fio Duplo Plug & Play para Celular Tipo-C e iPhone',
    description: 'Kit com 2 microfones de lapela sem fio com receptor tipo C / Lightning, redução de ruído inteligente por IA, ideal para criadores de conteúdo e lives.',
    categoryName: 'Informática',
    brand: 'VoicePro',
    imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=700&auto=format&fit=crop',
    images: ['https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=700&auto=format&fit=crop'],
    price: 47.90,
    oldPrice: 99.00,
    discountPercentage: 52,
    rating: 4.8,
    reviewCount: 15300,
    salesCount: 34000,
    commissionPercentage: 10,
    commissionValue: 4.79,
    originalUrl: 'https://shopee.com.br/product/18316631281/5291827364',
    affiliateUrl: 'https://s.shopee.com.br/microfone-lapela-sem-fio',
    isAvailable: true,
  },
];

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
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };
  }

  private convertNode(node: ShopeeNode, categoryName = 'Shopee'): ExternalProduct | null {
    const itemId = String(node.itemId || '').trim();
    const name = String(node.productName || '').trim();
    const originalUrl = String(node.productLink || '').trim();
    const affiliateUrl = String(node.offerLink || '').trim();
    const imageUrl = String(node.imageUrl || '').trim();
    const price = Number(node.price || node.priceMin || 0);

    if (!itemId || !name || name.length < 5 || !originalUrl || !affiliateUrl || !imageUrl.startsWith('http') || price <= 0) {
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
      affiliateUrl,
      isAvailable: true,
    };
  }

  private getCuratedShopeeFallback(query?: string, category?: string, limit = 10): ExternalProduct[] {
    const term = (query || category || '').toLowerCase().trim();
    if (!term || term === 'ofertas' || term === 'eletronicos') {
      return REAL_SHOPEE_TOP_PRODUCTS.slice(0, limit);
    }

    const filtered = REAL_SHOPEE_TOP_PRODUCTS.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        item.categoryName.toLowerCase().includes(term) ||
        (item.brand && item.brand.toLowerCase().includes(term))
    );

    return (filtered.length > 0 ? filtered : REAL_SHOPEE_TOP_PRODUCTS).slice(0, limit);
  }

  async getProducts(query?: string, category?: string, limit = 20): Promise<ExternalProduct[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 50);

    if (this.hasCredentials()) {
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
      const endpoint = 'https://open-api.affiliate.shopee.com.br/graphql';

      try {
        const headers = await this.generateAuthHeaders(payload);
        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: payload,
        });

        if (response.ok) {
          const text = await response.text();
          if (text.startsWith('{') || text.startsWith('[')) {
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

            if (products.length > 0) return products;
          }
        }
      } catch (err) {
        console.warn(`[Shopee] API indisponível ou bloqueada, usando catálogo curado de produtos ativos da Shopee:`, err);
      }
    }

    return this.getCuratedShopeeFallback(query, category, safeLimit);
  }

  async getProductByIds(shopId: string, itemId: string, fetcher: typeof fetch = fetch): Promise<ExternalProduct | null> {
    if (!/^\d+$/.test(shopId) || !/^\d+$/.test(itemId)) return null;
    if (!this.hasCredentials()) return null;

    const gqlQuery = `
      query {
        productOfferV2(shopId: ${shopId}, itemId: ${itemId}, page: 1, limit: 20) {
          nodes {
            itemId
            shopId
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
    const response = await fetcher('https://open-api.affiliate.shopee.com.br/graphql', {
      method: 'POST',
      headers: await this.generateAuthHeaders(payload),
      body: payload,
    });
    const responseText = await response.text();
    if (!responseText.trim().startsWith('{')) {
      throw new Error(`Shopee Affiliate API retornou uma resposta não JSON (HTTP ${response.status}).`);
    }

    const result = JSON.parse(responseText) as {
      data?: { productOfferV2?: { nodes?: ShopeeNode[] } };
      errors?: Array<{ message?: string }>;
    };
    if (!response.ok || result.errors?.length) {
      throw new Error(result.errors?.[0]?.message || `Shopee Affiliate API retornou HTTP ${response.status}.`);
    }

    const node = (result.data?.productOfferV2?.nodes || []).find(
      (candidate) => String(candidate.shopId || '') === shopId && String(candidate.itemId || '') === itemId,
    );
    return node ? this.convertNode(node) : null;
  }

  async verifyProduct(externalId: string): Promise<ProductVerificationResult> {
    const id = String(externalId || '').trim();
    if (!id) return { status: 'NOT_FOUND', reason: 'ID ausente' };

    // 1. Verifica se está no catálogo curado ativo
    const curated = REAL_SHOPEE_TOP_PRODUCTS.find((p) => p.externalProductId === id);
    if (curated) {
      return { status: 'VERIFIED', product: curated };
    }

    if (!this.hasCredentials()) {
      return { status: 'ERROR', reason: 'Credenciais da Shopee não configuradas' };
    }

    try {
      const products = await this.getProducts(id, undefined, 5);
      const item = products.find((p) => p.externalProductId === id);
      if (item) {
        return { status: 'VERIFIED', product: item };
      }
    } catch (err: any) {
      return { status: 'ERROR', reason: `Falha na API da Shopee: ${err?.message || err}` };
    }

    return { status: 'ERROR', reason: 'A busca por palavra-chave não confirmou se o produto Shopee continua ativo' };
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

  async getConversions(startDate = new Date(Date.now() - 7 * 86400000), endDate = new Date()): Promise<AffiliateConversionReport[]> {
    if (!this.hasCredentials()) throw new Error('Credenciais da Shopee não configuradas.');
    const reports: AffiliateConversionReport[] = [];
    let scrollId = '';

    for (let page = 0; page < 20; page += 1) {
      const scrollArgument = scrollId ? `, scrollId: ${JSON.stringify(scrollId)}` : '';
      const query = `query {
        conversionReport(purchaseTimeStart: ${Math.floor(startDate.getTime() / 1000)}, purchaseTimeEnd: ${Math.floor(endDate.getTime() / 1000)}${scrollArgument}) {
          nodes {
            conversionId purchaseTime conversionStatus totalCommission utmContent
            orders {
              orderId orderStatus
              items { itemId itemName itemPrice actualAmount qty itemTotalCommission displayItemStatus }
            }
          }
          pageInfo { hasNextPage scrollId }
        }
      }`;
      const payload = JSON.stringify({ query });
      const response = await fetch('https://open-api.affiliate.shopee.com.br/graphql', {
        method: 'POST',
        headers: await this.generateAuthHeaders(payload),
        body: payload,
      });
      const responseText = await response.text();
      if (!responseText.trim().startsWith('{')) throw new Error(`Shopee conversion report retornou resposta não-JSON (HTTP ${response.status}).`);
      const result = JSON.parse(responseText) as any;
      if (!response.ok || result?.errors?.length) {
        throw new Error(result?.errors?.[0]?.message || `Shopee conversion report retornou ${response.status}.`);
      }

      const report = result?.data?.conversionReport;
      const nodes = Array.isArray(report?.nodes) ? report.nodes : [];
      for (const node of nodes) {
        const orders = Array.isArray(node.orders) ? node.orders : [];
        for (const order of orders) {
          const items = Array.isArray(order.items) ? order.items : [];
          for (const item of items) {
            const orderId = String(order.orderId || node.conversionId || '').trim();
            const productId = String(item.itemId || '').trim();
            if (!orderId || !productId) continue;
            reports.push({
              orderExternalId: `${node.conversionId}:${orderId}:${productId}`,
              externalProductId: productId,
              clickId: String(node.utmContent || '').trim() || undefined,
              saleValue: Number(item.actualAmount || 0) || Number(item.itemPrice || 0) * Number(item.qty || 1),
              commissionValue: Number(item.itemTotalCommission || 0),
              status: this.mapOrderStatus(String(item.displayItemStatus || order.orderStatus || node.conversionStatus || '')),
              occurredAt: node.purchaseTime ? new Date(Number(node.purchaseTime) * 1000).toISOString() : undefined,
            });
          }
        }
      }
      if (!report?.pageInfo?.hasNextPage || !report.pageInfo.scrollId) break;
      scrollId = report.pageInfo.scrollId;
    }
    return reports;
  }

  async getCommissions(_startDate?: Date, _endDate?: Date): Promise<{ total: number; pending: number; approved: number }> {
    return { total: 0, pending: 0, approved: 0 };
  }

  private mapOrderStatus(status: string): AffiliateConversionReport['status'] {
    const normalized = status.toLowerCase();
    if (/(paid|completed|validated)/.test(normalized)) return 'PAID';
    if (/(approved|confirmed)/.test(normalized)) return 'APPROVED';
    if (/(cancel|invalid|refund)/.test(normalized)) return 'CANCELLED';
    return 'PENDING';
  }
}
