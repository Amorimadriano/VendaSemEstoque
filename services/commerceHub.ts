import { getMarketplaceIntegration } from '@/integrations';
import { ExternalProduct } from '@/types';

export type CommerceChannel = 'mercadolivre' | 'shopee' | 'aliexpress' | 'hotmart' | 'instagram' | 'facebook' | 'site';

type ConnectorStatus = {
  channel: CommerceChannel;
  ready: boolean;
  capabilities: string[];
  message: string;
};

function hasValues(...values: Array<string | undefined>) {
  return values.every(Boolean);
}

export function getCommerceHubStatus(): ConnectorStatus[] {
  return [
    {
      channel: 'mercadolivre',
      ready: hasValues(process.env.MERCADOLIVRE_ACCESS_TOKEN || process.env.MERCADOLIVRE_REFRESH_TOKEN, process.env.MERCADOLIVRE_CLIENT_ID, process.env.MERCADOLIVRE_CLIENT_SECRET),
      capabilities: ['buscar_produtos', 'consultar_preco', 'consultar_estoque', 'consultar_vendas'],
      message: 'Use credenciais OAuth oficiais do Mercado Livre no ambiente do servidor.',
    },
    {
      channel: 'shopee',
      ready: hasValues(process.env.SHOPEE_APP_ID, process.env.SHOPEE_SECRET) && process.env.SHOPEE_SECRET !== 'seu_secret',
      capabilities: ['buscar_produtos', 'consultar_preco', 'consultar_estoque'],
      message: 'Conector aguarda credenciais e permissões oficiais da modalidade Shopee escolhida.',
    },
    {
      channel: 'aliexpress',
      ready: hasValues(process.env.ALIEXPRESS_APP_KEY, process.env.ALIEXPRESS_APP_SECRET, process.env.ALIEXPRESS_TRACKING_ID),
      capabilities: ['buscar_produtos', 'consultar_preco', 'consultar_estoque'],
      message: 'Conector de afiliados AliExpress disponível com credenciais oficiais.',
    },
    {
      channel: 'hotmart',
      ready: false,
      capabilities: ['consultar_vendas', 'consultar_metricas', 'receber_webhooks'],
      message: 'Configure credenciais Hotmart e webhooks oficiais para ativar este conector.',
    },
    {
      channel: 'instagram',
      ready: false,
      capabilities: ['criar_conteudo', 'publicar_conteudo'],
      message: 'Configure a API oficial da Meta e autorização explícita antes de publicar.',
    },
    {
      channel: 'facebook',
      ready: false,
      capabilities: ['criar_conteudo', 'publicar_conteudo'],
      message: 'Configure a API oficial da Meta e autorização explícita antes de publicar.',
    },
    {
      channel: 'site',
      ready: true,
      capabilities: ['buscar_produtos', 'consultar_preco', 'consultar_estoque', 'consultar_metricas', 'criar_conteudo'],
      message: 'Dados do catálogo e métricas locais estão disponíveis.',
    },
  ];
}

export async function buscarProdutos(channel: Extract<CommerceChannel, 'mercadolivre' | 'shopee' | 'aliexpress'>, query: string, limit = 20): Promise<ExternalProduct[]> {
  return getMarketplaceIntegration(channel).getProducts(query, undefined, Math.min(limit, 50));
}

export async function consultarPreco(channel: Extract<CommerceChannel, 'mercadolivre' | 'shopee' | 'aliexpress'>, externalProductId: string) {
  return getMarketplaceIntegration(channel).getPrice(externalProductId);
}

export async function consultarEstoque(channel: Extract<CommerceChannel, 'mercadolivre' | 'shopee' | 'aliexpress'>, externalProductId: string) {
  return getMarketplaceIntegration(channel).getAvailability(externalProductId);
}

export async function consultarVendas(channel: Extract<CommerceChannel, 'mercadolivre' | 'shopee' | 'aliexpress'>, startDate?: Date, endDate?: Date) {
  return getMarketplaceIntegration(channel).getConversions(startDate, endDate);
}

export function requiresApproval(command: 'criar_anuncio' | 'atualizar_anuncio' | 'publicar_conteudo' | 'criar_conteudo') {
  return command === 'criar_anuncio' || command === 'atualizar_anuncio' || command === 'publicar_conteudo';
}