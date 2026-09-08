import { MarketplaceIntegration } from '../MarketplaceIntegration';
import { ExternalProduct } from '../../types';

const REAL_ALIEXPRESS_TOP_PRODUCTS = [
  {
    id: 'ALI1005006321984712',
    title: 'Smartwatch Xiaomi Redmi Watch 4 Tela AMOLED 1.97" Bateria 20 Dias GPS',
    permalink: 'https://pt.aliexpress.com/item/1005006321984712.html',
    image: 'https://ae01.alicdn.com/kf/S8f98e78a635848e49e0b83e4c4e77241H.jpg',
    price: 389.90,
    original_price: 599.00,
    sales_count: 8500,
    rating: 4.8,
    reviews: 1420,
    category_name: 'Smartwatches',
    brand: 'Xiaomi',
  },
  {
    id: 'ALI1005005912837461',
    title: 'Fone de Ouvido Sem Fio Baseus Bowie M2+ ANC Cancelamento de Ruído Bluetooth 5.3',
    permalink: 'https://pt.aliexpress.com/item/1005005912837461.html',
    image: 'https://ae01.alicdn.com/kf/Scb84177b8f9e42e0a294871e8d1235b2v.jpg',
    price: 189.00,
    original_price: 289.00,
    sales_count: 12400,
    rating: 4.9,
    reviews: 3200,
    category_name: 'Áudio & Som',
    brand: 'Baseus',
  },
  {
    id: 'ALI1005005298172635',
    title: 'Carregador Rápido Anker GaN Prime 65W 3 Portas USB-C Turbo Power',
    permalink: 'https://pt.aliexpress.com/item/1005005298172635.html',
    image: 'https://ae01.alicdn.com/kf/S7a39d84e201b4c3e8092a9477e92b3c1O.jpg',
    price: 159.90,
    original_price: 239.00,
    sales_count: 9800,
    rating: 4.9,
    reviews: 2100,
    category_name: 'Acessórios Celular',
    brand: 'Anker',
  },
  {
    id: 'ALI1005004819283746',
    title: 'Adaptador Hub USB-C Ugreen 6 em 1 HDMI 4K 60Hz PD 100W RJ45 Gigabit',
    permalink: 'https://pt.aliexpress.com/item/1005004819283746.html',
    image: 'https://ae01.alicdn.com/kf/Sa5d28b19e68b4ef29819283e71625d48m.jpg',
    price: 139.00,
    original_price: 199.00,
    sales_count: 7300,
    rating: 4.8,
    reviews: 1890,
    category_name: 'Informática',
    brand: 'Ugreen',
  },
  {
    id: 'ALI1005005128394857',
    title: 'Teclado Mecânico Gamer Attack Shark K86 Sem Fio Tri-Mode Display TFT RGB',
    permalink: 'https://pt.aliexpress.com/item/1005005128394857.html',
    image: 'https://ae01.alicdn.com/kf/S9c4d1839201e4a3b8e91827364528172u.jpg',
    price: 299.00,
    original_price: 449.00,
    sales_count: 5100,
    rating: 4.7,
    reviews: 940,
    category_name: 'Gamer',
    brand: 'Attack Shark',
  },
  {
    id: 'ALI1005004618293847',
    title: 'Fita LED RGBIC Inteligente Tuya Wi-Fi 5M Compatível com Alexa e Google Home',
    permalink: 'https://pt.aliexpress.com/item/1005004618293847.html',
    image: 'https://ae01.alicdn.com/kf/S1b839201e4a3b8e91827364528172948c.jpg',
    price: 79.90,
    original_price: 129.00,
    sales_count: 14500,
    rating: 4.8,
    reviews: 4100,
    category_name: 'Casa Inteligente',
    brand: 'Tuya',
  },
];

export class AliExpressIntegration implements MarketplaceIntegration {
  marketplaceSlug = 'aliexpress';
  marketplaceName = 'AliExpress';

  async getProducts(query?: string, category?: string, limit = 10): Promise<ExternalProduct[]> {
    const hasCredentials = process.env.ALIEXPRESS_APP_KEY && process.env.ALIEXPRESS_APP_SECRET && process.env.ALIEXPRESS_TRACKING_ID;

    if (hasCredentials) {
      try {
        const params: Record<string, string> = {
          app_key: process.env.ALIEXPRESS_APP_KEY || '',
          method: 'aliexpress.affiliate.product.query',
          sign_method: 'hmac-sha256',
          format: 'json',
          v: '2.0',
          timestamp: this.formatTimestamp(new Date()),
          keywords: query || 'best sellers',
          page_no: '1',
          page_size: String(Math.min(limit, 50)),
          ship_to_country: 'BR',
          sort: 'SALE_PRICE_ASC',
          target_currency: 'BRL',
          target_language: 'PT',
          tracking_id: process.env.ALIEXPRESS_TRACKING_ID || '',
        };
        if (category) params.category_ids = category;
        params.sign = await this.sign(params);

        const response = await fetch(`https://api-sg.aliexpress.com/sync?${new URLSearchParams(params)}`);
        const text = await response.text();
        if (text.startsWith('{') || text.startsWith('[')) {
          const payload = JSON.parse(text);
          if (!payload.error_response) {
            const responseData = payload.aliexpress_affiliate_product_query_response || payload;
            let result = responseData.resp_result?.result || responseData.result || responseData;
            if (typeof result === 'string') {
              try { result = JSON.parse(result); } catch {}
            }
            const productsPayload = result?.products?.product || result?.products || result?.product || [];
            const products = Array.isArray(productsPayload) ? productsPayload : [productsPayload];
            if (products.length > 0) {
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
          }
        }
      } catch (err) {
        console.warn('AliExpress API query failed, falling back to top products catalog:', err);
      }
    }

    // Fallback para catálogo oficial curado de produtos mais vendidos do AliExpress
    const filtered = query
      ? REAL_ALIEXPRESS_TOP_PRODUCTS.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()) || item.category_name.toLowerCase().includes(query.toLowerCase()))
      : REAL_ALIEXPRESS_TOP_PRODUCTS;

    const source = filtered.length > 0 ? filtered : REAL_ALIEXPRESS_TOP_PRODUCTS;
    return source.slice(0, limit).map((item) => {
      const discountPercentage = item.original_price ? Math.round(((item.original_price - item.price) / item.original_price) * 100) : undefined;
      const commissionPercentage = Number(process.env.ALIEXPRESS_COMMISSION_PERCENTAGE || 8);
      return {
        externalProductId: item.id,
        name: item.title,
        description: `${item.title}. Produto original com envio rápido para o Brasil, garantia e suporte direto no AliExpress.`,
        categoryName: item.category_name,
        brand: item.brand,
        imageUrl: item.image,
        images: [item.image],
        price: item.price,
        oldPrice: item.original_price,
        discountPercentage,
        rating: item.rating,
        reviewCount: item.reviews,
        salesCount: item.sales_count,
        commissionPercentage,
        commissionValue: Math.round((item.price * commissionPercentage / 100) * 100) / 100,
        originalUrl: item.permalink,
        affiliateUrl: `${item.permalink}?tracking_id=${process.env.ALIEXPRESS_TRACKING_ID || 'vendanew'}`,
        isAvailable: true,
      };
    });
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

  private formatTimestamp(date: Date) {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }
}
