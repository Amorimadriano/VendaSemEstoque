import { ExternalProduct } from '../types';

export type ProductVerificationStatus =
  | 'VERIFIED'
  | 'NOT_FOUND'
  | 'ERROR';

export interface ProductVerificationResult {
  status: ProductVerificationStatus;
  product?: ExternalProduct;
  reason?: string;
}

export interface MarketplaceIntegration {
  marketplaceSlug: string;
  marketplaceName: string;

  /**
   * Busca candidatos no marketplace.
   * O resultado deve vir exclusivamente da API oficial.
   */
  getProducts(
    query?: string,
    category?: string,
    limit?: number
  ): Promise<ExternalProduct[]>;

  /**
   * Verifica exatamente um produto pelo ID externo.
   *
   * IMPORTANTE:
   * Não deve fazer uma busca textual e retornar o primeiro resultado.
   * O ID retornado pela API precisa ser exatamente igual ao externalId.
   */
  getProduct(externalId: string): Promise<ExternalProduct | null>;

  /**
   * Verificação detalhada para diferenciar:
   * - produto confirmado
   * - produto realmente inexistente/inativo
   * - erro temporário da API
   */
  verifyProduct?(
    externalId: string
  ): Promise<ProductVerificationResult>;

  getCategories(): Promise<
    { id: string; name: string; slug: string }[]
  >;

  getPrice(
    externalId: string
  ): Promise<{ price: number; oldPrice?: number } | null>;

  getAvailability(externalId: string): Promise<boolean>;

  createAffiliateLink(
    productUrl: string,
    customTrackingId?: string
  ): Promise<string>;

  getClicks(
    startDate?: Date,
    endDate?: Date
  ): Promise<number>;

  getConversions(
    startDate?: Date,
    endDate?: Date
  ): Promise<any[]>;

  getCommissions(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    total: number;
    pending: number;
    approved: number;
  }>;
}