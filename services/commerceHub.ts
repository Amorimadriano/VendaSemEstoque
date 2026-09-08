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
      capabilities: ['buscar_produtos', 'consultar_preco', 'consultar_estoque', 'consultar_metricas'],
      message: 'Modo afiliado: catálogo, preço e disponibilidade estão disponíveis. Conversões exigem o relatório oficial do programa de afiliados.',
    },
    {
      channel: 'shopee',
      ready: hasValues(process.env.SHOPEE_APP_ID, process.env.SHOPEE_SECRET),
      capabilities: ['buscar_produtos', 'consultar_preco', 'consultar_estoque'],
      message: hasValues(process.env.SHOPEE_APP_ID, process.env.SHOPEE_SECRET)
        ? 'Pronto: credenciais SHOPEE_APP_ID e SHOPEE_SECRET configuradas para a API GraphQL de Afiliados Shopee.'
        : 'Modo afiliado: configure SHOPEE_APP_ID e SHOPEE_SECRET para ativar o conector oficial da Shopee.',
    },
    {
      channel: 'aliexpress',
      ready: hasValues(process.env.ALIEXPRESS_APP_KEY, process.env.ALIEXPRESS_APP_SECRET, process.env.ALIEXPRESS_TRACKING_ID),
      capabilities: ['buscar_produtos', 'consultar_preco', 'consultar_estoque'],
      message: 'Modo afiliado: pesquisa produtos, preços e disponibilidade; vendas e comissões exigem a API de relatórios autorizada.',
    },
    {
      channel: 'hotmart',
      ready: Boolean(process.env.HOTMART_WEBHOOK_TOKEN),
      capabilities: ['consultar_vendas', 'consultar_metricas', 'receber_webhooks'],
      message: 'Modo produtor: vendas, reembolsos e cancelamentos chegam pelo webhook oficial.',
    },
    {
      channel: 'instagram',
      ready: hasValues(process.env.META_ACCESS_TOKEN, process.env.META_INSTAGRAM_ACCOUNT_ID),
      capabilities: ['criar_conteudo', 'publicar_conteudo'],
      message: hasValues(process.env.META_ACCESS_TOKEN, process.env.META_INSTAGRAM_ACCOUNT_ID)
        ? 'Pronto para publicação via Meta Graph API do Instagram (requer permissão instagram_content_publish).'
        : 'Configure META_ACCESS_TOKEN e META_INSTAGRAM_ACCOUNT_ID antes de publicar.',
    },
    {
      channel: 'facebook',
      ready: hasValues(process.env.META_ACCESS_TOKEN, process.env.META_FACEBOOK_PAGE_ID),
      capabilities: ['criar_conteudo', 'publicar_conteudo'],
      message: hasValues(process.env.META_ACCESS_TOKEN, process.env.META_FACEBOOK_PAGE_ID)
        ? 'Pronto para publicação de posts e fotos na Página do Facebook.'
        : 'Configure META_ACCESS_TOKEN e META_FACEBOOK_PAGE_ID antes de publicar.',
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