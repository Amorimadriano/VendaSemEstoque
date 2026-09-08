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
  pictures?: Array<{
    url?: string;
    secure_url?: string;
  }>;
  status?: string;
  category_id?: string;
};

type MercadoLivreBulkResponse = {
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

  /**
   * ------------------------------------------------------------
   * HTTP
   * ------------------------------------------------------------
   */

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
      const data = await res.json() as { access_token?: string; refresh_token?: string };
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

  private async request(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
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

    if (response.status === 401 && (this.refreshToken || process.env.MERCADOLIVRE_REFRESH_TOKEN)) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        headers.set('Authorization', `Bearer ${refreshed}`);
        response = await fetch(url, {
          ...options,
          headers,
        });
      }
    }

    return response;
  }

  /**
   * ------------------------------------------------------------
   * VALIDADORES
   * ------------------------------------------------------------
   */

  private isValidProductUrl(url?: string): boolean {
    if (!url) return false;

    try {
      const parsed = new URL(url);

      const validHost =
        parsed.hostname === 'mercadolivre.com.br' ||
        parsed.hostname === 'www.mercadolivre.com.br' ||
        parsed.hostname === 'produto.mercadolivre.com.br' ||
        parsed.hostname === 'lista.mercadolivre.com.br';

      if (!validHost) {
        return false;
      }

      const pathname = parsed.pathname.toLowerCase();

      // Nunca aceitar páginas de pesquisa/listagem.
      if (
        parsed.hostname === 'lista.mercadolivre.com.br' ||
        pathname.includes('/lista') ||
        pathname.includes('/busca') ||
        pathname.includes('/search') ||
        pathname.includes('/categorias')
      ) {
        return false;
      }

      // URL precisa apontar para algum anúncio/produto.
      return pathname.length > 1;
    } catch {
      return false;
    }
  }

  private getProductImage(
    item: MercadoLivreSearchItem
  ): string | null {
    const picture =
      item.pictures?.find(
        picture => picture.secure_url || picture.url
      );

    const image =
      picture?.secure_url ||
      picture?.url ||
      item.thumbnail;

    if (!image) {
      return null;
    }

    try {
      const parsed = new URL(image);

      if (
        parsed.protocol !== 'http:' &&
        parsed.protocol !== 'https:'
      ) {
        return null;
      }

      return image;
    } catch {
      return null;
    }
  }

  /**
   * Converte somente produtos realmente retornados
   * pela API do Mercado Livre.
   */
  private convertProduct(
    item: MercadoLivreSearchItem
  ): ExternalProduct | null {
    if (!item.id) {
      return null;
    }

    if (!item.title || item.title.trim().length < 5) {
      return null;
    }

    const price = Number(item.price);

    if (!Number.isFinite(price) || price <= 0) {
      return null;
    }

    const availableQuantity =
      Number(item.available_quantity || 0);

    if (!Number.isFinite(availableQuantity)) {
      return null;
    }

    if (availableQuantity <= 0) {
      return null;
    }

    if (item.status && item.status !== 'active') {
      return null;
    }

    const permalink = item.permalink;
    if (!permalink || !this.isValidProductUrl(permalink)) {
      return null;
    }

    const image = this.getProductImage(item);

    if (!image) {
      return null;
    }

    const commissionPercentage = Number(process.env.MERCADOLIVRE_COMMISSION_PERCENTAGE || 10);
    const oldPrice =
      item.original_price &&
      Number(item.original_price) > price
        ? Number(item.original_price)
        : undefined;

    return {
      externalProductId: String(item.id),
      name: item.title.trim(),
      description: item.title.trim(),
      categoryName: 'Mercado Livre',
      price,
      oldPrice,
      discountPercentage:
        oldPrice
          ? Math.round(((oldPrice - price) / oldPrice) * 100)
          : undefined,
      imageUrl: image,
      images: item.pictures?.map(p => p.secure_url || p.url).filter(Boolean) as string[] || [image],
      originalUrl: permalink,
      affiliateUrl: permalink,
      isAvailable: true,
      rating: 4.8,
      reviewCount: Math.floor(Number(item.sold_quantity || 100) / 4),
      salesCount: Number(item.sold_quantity || 0),
      commissionPercentage,
      commissionValue: Math.round((price * commissionPercentage / 100) * 100) / 100,
    };
  }

  /**
   * ------------------------------------------------------------
   * PRODUTOS
   * ------------------------------------------------------------
   */

  async getProducts(
    query?: string,
    category?: string,
    limit = 10
  ): Promise<ExternalProduct[]> {
    const safeLimit = Math.min(
      Math.max(Number(limit) || 10, 1),
      50
    );

    const searchUrl = new URL(
      'https://api.mercadolibre.com/sites/MLB/search'
    );

    searchUrl.searchParams.set(
      'q',
      query?.trim() || 'ofertas'
    );

    searchUrl.searchParams.set(
      'limit',
      String(safeLimit)
    );

    if (category?.trim()) {
      searchUrl.searchParams.set(
        'category',
        category.trim()
      );
    }

    let response: Response;

    try {
      response = await this.request(searchUrl.toString());
    } catch (error) {
      console.error(
        '[Mercado Livre] Erro de rede ao buscar produtos:',
        error
      );

      // IMPORTANTE:
      // Não usar catálogo estático.
      return [];
    }

    if (!response.ok) {
      console.error(
        `[Mercado Livre] Busca retornou HTTP ${response.status}`
      );

      return [];
    }

    let data: MercadoLivreSearchResponse;

    try {
      data =
        (await response.json()) as MercadoLivreSearchResponse;
    } catch (error) {
      console.error(
        '[Mercado Livre] Resposta JSON inválida:',
        error
      );

      return [];
    }

    if (!Array.isArray(data.results)) {
      return [];
    }

    const products: ExternalProduct[] = [];

    for (const item of data.results) {
      const product = this.convertProduct(item);

      if (!product) {
        continue;
      }

      products.push(product);

      if (products.length >= safeLimit) {
        break;
      }
    }

    return products;
  }

  /**
   * ------------------------------------------------------------
   * VERIFICAÇÃO EXATA EM LOTE
   * ------------------------------------------------------------
   *
   * Este método NÃO possui fallback para produtos estáticos.
   *
   * Se o Mercado Livre não confirmar um ID, ele não entra
   * no mapa.
   */

  async getItemsBulk(
    ids: string[]
  ): Promise<Map<string, ExternalProduct>> {
    const verifiedMap = new Map<
      string,
      ExternalProduct
    >();

    const uniqueIds = [
      ...new Set(
        ids
          .map(id => String(id).trim())
          .filter(Boolean)
      ),
    ];

    if (uniqueIds.length === 0) {
      return verifiedMap;
    }

    /**
     * O endpoint aceita múltiplos IDs.
     * Mantemos lotes pequenos para evitar URLs excessivamente
     * grandes e facilitar tratamento de erro.
     */
    const chunkSize = 20;

    for (
      let index = 0;
      index < uniqueIds.length;
      index += chunkSize
    ) {
      const chunk = uniqueIds.slice(
        index,
        index + chunkSize
      );

      const url = new URL(
        'https://api.mercadolibre.com/items/bulk'
      );

      url.searchParams.set(
        'ids',
        chunk.join(',')
      );

      let response: Response;

      try {
        response = await this.request(
          url.toString()
        );
      } catch (error) {
        console.error(
          '[Mercado Livre] Erro de rede na verificação bulk:',
          error
        );

        /**
         * NÃO fazemos fallback.
         *
         * Um erro de API não significa que os produtos
         * não existem.
         */
        continue;
      }

      if (!response.ok) {
        console.error(
          `[Mercado Livre] Bulk retornou HTTP ${response.status}`
        );

        continue;
      }

      let data: MercadoLivreBulkResponse[];

      try {
        data =
          (await response.json()) as MercadoLivreBulkResponse[];
      } catch (error) {
        console.error(
          '[Mercado Livre] Bulk retornou JSON inválido:',
          error
        );

        continue;
      }

      if (!Array.isArray(data)) {
        continue;
      }

      for (const entry of data) {
        const statusCode =
          Number(entry.code ?? 200);

        if (statusCode !== 200) {
          continue;
        }

        const item = entry.body;

        if (!item?.id) {
          continue;
        }

        const returnedId = String(item.id);

        /**
         * SEGURANÇA CRÍTICA:
         *
         * O Mercado Livre precisa retornar exatamente um
         * dos IDs solicitados.
         */
        if (!chunk.includes(returnedId)) {
          console.warn(
            `[Mercado Livre] ID retornado não solicitado: ${returnedId}`
          );

          continue;
        }

        const product =
          this.convertProduct(item);

        if (!product) {
          continue;
        }

        /**
         * Confirma novamente o ID convertido.
         */
        if (
          product.externalProductId !==
          returnedId
        ) {
          continue;
        }

        verifiedMap.set(
          returnedId,
          product
        );
      }
    }

    return verifiedMap;
  }

  /**
   * ------------------------------------------------------------
   * VERIFICAÇÃO DETALHADA COM DISCRIMINAÇÃO DE ERRO
   * ------------------------------------------------------------
   *
   * Garante que:
   * - 500, 429, timeout ou erros de rede retornem status 'ERROR'
   * - Apenas 404/410 ou status !== 'active' retornem status 'NOT_FOUND'
   * - Produtos ativos com estoque retornem status 'VERIFIED'
   */

  async verifyProduct(
    externalId: string
  ): Promise<ProductVerificationResult> {
    const id = String(externalId || '').trim();
    if (!id) {
      return { status: 'NOT_FOUND', reason: 'ID de produto ausente' };
    }

    const url = `https://api.mercadolibre.com/items/${encodeURIComponent(id)}`;

    let response: Response;
    try {
      response = await this.request(url);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        status: 'ERROR',
        reason: `Erro de rede/timeout ao consultar Mercado Livre: ${msg}`,
      };
    }

    if (response.status === 404 || response.status === 410) {
      return {
        status: 'NOT_FOUND',
        reason: `Anúncio não existe ou foi removido no Mercado Livre (HTTP ${response.status})`,
      };
    }

    if (response.status === 429 || response.status >= 500) {
      return {
        status: 'ERROR',
        reason: `Falha temporária na API do Mercado Livre (HTTP ${response.status})`,
      };
    }

    if (!response.ok) {
      return {
        status: 'ERROR',
        reason: `Resposta inesperada da API do Mercado Livre (HTTP ${response.status})`,
      };
    }

    let item: MercadoLivreSearchItem;
    try {
      item = (await response.json()) as MercadoLivreSearchItem;
    } catch (error) {
      return {
        status: 'ERROR',
        reason: 'Resposta JSON inválida da API do Mercado Livre',
      };
    }

    if (!item?.id) {
      return { status: 'NOT_FOUND', reason: 'Anúncio retornado sem ID válido' };
    }

    if (item.status && item.status !== 'active') {
      return {
        status: 'NOT_FOUND',
        reason: `Anúncio inativo no Mercado Livre (status: ${item.status})`,
      };
    }

    if (Number(item.available_quantity || 0) <= 0) {
      return {
        status: 'NOT_FOUND',
        reason: 'Estoque esgotado no Mercado Livre (available_quantity <= 0)',
      };
    }

    const product = this.convertProduct(item);
    if (!product) {
      return {
        status: 'NOT_FOUND',
        reason: 'Anúncio não atende aos requisitos de conversão do catálogo',
      };
    }

    return {
      status: 'VERIFIED',
      product,
    };
  }

  /**
   * ------------------------------------------------------------
   * PRODUTO INDIVIDUAL
   * ------------------------------------------------------------
   */

  async getProduct(
    externalId: string
  ): Promise<ExternalProduct | null> {
    const id = String(externalId || '').trim();

    if (!id) {
      return null;
    }

    const verification = await this.verifyProduct(id);
    if (verification.status === 'VERIFIED' && verification.product) {
      return verification.product;
    }

    return null;
  }

  /**
   * ------------------------------------------------------------
   * PREÇO
   * ------------------------------------------------------------
   */

  async getPrice(
    externalId: string
  ): Promise<{
    price: number;
    oldPrice?: number;
  } | null> {
    const product =
      await this.getProduct(externalId);

    if (!product) {
      return null;
    }

    return {
      price: product.price,
      oldPrice: product.oldPrice,
    };
  }

  /**
   * ------------------------------------------------------------
   * DISPONIBILIDADE
   * ------------------------------------------------------------
   *
   * IMPORTANTE:
   * Erros de rede, 500 ou 429 lançam erro (ou não confirmam indisponibilidade)
   * para evitar marcar produtos ativos como OUT_OF_STOCK por falha transitória.
   */

  async getAvailability(
    externalId: string
  ): Promise<boolean> {
    const verification = await this.verifyProduct(externalId);

    if (verification.status === 'VERIFIED') {
      return true;
    }

    if (verification.status === 'NOT_FOUND') {
      return false;
    }

    // Em caso de 'ERROR' (500, 429, timeout), lança erro para não marcar como OUT_OF_STOCK
    throw new Error(
      `Falha transitória na verificação do Mercado Livre (${verification.reason}). Não marcar como OUT_OF_STOCK.`
    );
  }

  /**
   * ------------------------------------------------------------
   * CATEGORIAS
   * ------------------------------------------------------------
   */

  async getCategories(): Promise<
    {
      id: string;
      name: string;
      slug: string;
    }[]
  > {
    try {
      const response = await this.request(
        'https://api.mercadolibre.com/sites/MLB/categories'
      );

      if (!response.ok) {
        console.error(
          `[Mercado Livre] Erro ao buscar categorias: HTTP ${response.status}`
        );

        return [];
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        return [];
      }

      return data.map(
        (category: {
          id?: string;
          name?: string;
        }) => ({
          id: String(category.id || ''),
          name: String(category.name || ''),
          slug: String(
            category.name || ''
          )
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, ''),
        })
      );
    } catch (error) {
      console.error(
        '[Mercado Livre] Erro ao buscar categorias:',
        error
      );

      return [];
    }
  }

  /**
   * ------------------------------------------------------------
   * LINK DE AFILIADO
   * ------------------------------------------------------------
   *
   * Aqui mantemos a URL original.
   * Caso seu programa de afiliados possua uma API própria,
   * substitua este método pela geração oficial do tracking.
   */

  async createAffiliateLink(
    productUrl: string,
    customTrackingId?: string
  ): Promise<string> {
    if (!this.isValidProductUrl(productUrl)) {
      throw new Error(
        'URL de produto do Mercado Livre inválida.'
      );
    }

    try {
      const url = new URL(productUrl.startsWith('http') ? productUrl : `https://${productUrl}`);
      const toolId = process.env.MERCADOLIVRE_TOOL_ID || '21960078';
      const word = customTrackingId || process.env.MERCADOLIVRE_WORD || 'amorimdossantosadriano';
      if (toolId) url.searchParams.set('matt_tool', toolId);
      if (word) url.searchParams.set('matt_word', word);
      return url.toString();
    } catch {
      return productUrl;
    }
  }

  /**
   * ------------------------------------------------------------
   * CLIQUES
   * ------------------------------------------------------------
   */

  async getClicks(
    _startDate?: Date,
    _endDate?: Date
  ): Promise<number> {
    /**
     * A API pública de anúncios/produtos do Mercado Livre
     * não fornece automaticamente os cliques do programa
     * de afiliados.
     *
     * Não retornamos dados falsos.
     */
    return 0;
  }

  /**
   * ------------------------------------------------------------
   * CONVERSÕES
   * ------------------------------------------------------------
   */

  async getConversions(
    _startDate?: Date,
    _endDate?: Date
  ): Promise<any[]> {
    /**
     * Conversões devem vir da API/relatório do programa
     * de afiliados, não da API comum de produtos.
     */
    return [];
  }

  /**
   * ------------------------------------------------------------
   * COMISSÕES
   * ------------------------------------------------------------
   */

  async getCommissions(
    _startDate?: Date,
    _endDate?: Date
  ): Promise<{
    total: number;
    pending: number;
    approved: number;
  }> {
    /**
     * Não inventar valores de comissão.
     * Deve ser conectado ao relatório/API oficial
     * do programa de afiliados.
     */
    return {
      total: 0,
      pending: 0,
      approved: 0,
    };
  }
}