import { getSupabase } from '@/lib/supabase';
import { getMarketplaceIntegration } from '@/integrations';

export interface VerifiedProductSummary {
  id: string;
  name: string;
  externalProductId: string;
  marketplaceSlug: string;
  reason: string;
}

export interface VerificationAgentReport {
  startedAt: string;
  finishedAt: string;
  totalChecked: number;
  healthyCount: number;
  deletedCount: number;
  deletedProducts: VerifiedProductSummary[];
  errors: string[];
}

function isOfficialShopeeAffiliateUrl(value?: string | null): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return host.includes('shopee.com.br') || host.includes('shope.ee') || host.includes('shopee');
  } catch {
    return false;
  }
}

/**
 * Remove com segurança um produto do banco de dados, excluindo
 * em cascata todas as dependências em tabelas filhas.
 */
export async function deleteProductSafely(productId: string): Promise<boolean> {
  const supabase = getSupabase();

  try {
    // 1. Obter IDs de marketing_content para limpar vídeos vinculados
    const { data: contents } = await supabase
      .from('marketing_content')
      .select('id')
      .eq('product_id', productId);

    const contentIds = (contents || []).map((c: any) => c.id);
    if (contentIds.length > 0) {
      await supabase.from('marketing_videos').delete().in('content_id', contentIds);
    }

    // 2. Limpar tabelas com chave estrangeira para o produto
    const childTables = [
      'marketing_content',
      'marketing_campaigns',
      'marketing_ab_tests',
      'price_alerts',
      'price_history',
      'product_metrics',
      'clicks',
      'conversions',
      'affiliate_links',
      'favorites',
    ];

    for (const table of childTables) {
      try {
        await supabase.from(table).delete().eq('product_id', productId);
      } catch (err) {
        // Ignora caso a tabela opcional não tenha o registro
      }
    }

    // 3. Excluir o produto da tabela principal
    const { error: delErr } = await supabase.from('products').delete().eq('id', productId);
    if (delErr) throw delErr;

    return true;
  } catch (error) {
    console.error(`[VerifierAgent] Erro ao excluir produto ${productId}:`, error);
    return false;
  }
}

/**
 * Agente de Pesquisa e Integridade de Produtos:
 * Varre os produtos cadastrados no site, consulta o marketplace parceiro e,
 * caso o produto não exista mais, esteja esgotado ou tenha sido descontinuado,
 * exclui o produto automaticamente para manter o catálogo 100% atualizado.
 */
export async function runProductPartnerVerifierAgent(options?: {
  batchSize?: number;
  marketplaceSlug?: string;
}): Promise<VerificationAgentReport> {
  const startedAt = new Date().toISOString();
  const supabase = getSupabase();
  const batchSize = options?.batchSize || 100;

  const report: VerificationAgentReport = {
    startedAt,
    finishedAt: '',
    totalChecked: 0,
    healthyCount: 0,
    deletedCount: 0,
    deletedProducts: [],
    errors: [],
  };

  try {
    let query = supabase
      .from('products')
      .select('id, name, external_product_id, original_url, affiliate_url, image_url, status, price, marketplace:marketplaces(id, slug, name)')
      .order('last_synced_at', { ascending: true, nullsFirst: true })
      .limit(batchSize);

    if (options?.marketplaceSlug) {
      const { data: mkt } = await supabase
        .from('marketplaces')
        .select('id')
        .eq('slug', options.marketplaceSlug)
        .maybeSingle();

      if (mkt?.id) {
        query = query.eq('marketplace_id', mkt.id);
      }
    }

    const { data: products, error: fetchErr } = await query;
    if (fetchErr) throw fetchErr;

    report.totalChecked = products?.length || 0;
    if (!products || products.length === 0) {
      report.finishedAt = new Date().toISOString();
      return report;
    }

    for (const product of products) {
      const marketplaceSlug = (product as any).marketplace?.slug;
      const externalId = product.external_product_id;

      if (!marketplaceSlug || !externalId) {
        // Produto sem identificador válido é removido
        await deleteProductSafely(product.id);
        report.deletedCount += 1;
        report.deletedProducts.push({
          id: product.id,
          name: product.name,
          externalProductId: externalId || 'N/A',
          marketplaceSlug: marketplaceSlug || 'desconhecido',
          reason: 'Identificador externo ou marketplace ausente.',
        });
        continue;
      }

      // A Shopee product URL without an official offerLink cannot attribute commission.
      if (marketplaceSlug === 'shopee' && !isOfficialShopeeAffiliateUrl((product as any).affiliate_url)) {
        const deleted = await deleteProductSafely(product.id);
        if (deleted) {
          report.deletedCount += 1;
          report.deletedProducts.push({
            id: product.id,
            name: product.name,
            externalProductId: externalId,
            marketplaceSlug,
            reason: 'Link da Shopee não é um offerLink oficial de afiliado.',
          });
        }
        continue;
      }

      try {
        const integration = getMarketplaceIntegration(marketplaceSlug);
        let shouldDelete = false;
        let deleteReason = '';

        // 1. Verificação via método verifyProduct da integração
        if (typeof (integration as any).verifyProduct === 'function') {
          const check = await (integration as any).verifyProduct(externalId);

          if (check.status === 'NOT_FOUND') {
            shouldDelete = true;
            deleteReason = check.reason || 'Produto não encontrado ou inativo no marketplace parceiro.';
          }
        } else {
          // 2. Verificação via getProduct
          const partnerProduct = await integration.getProduct(externalId);
          if (!partnerProduct || partnerProduct.isAvailable === false) {
            shouldDelete = true;
            deleteReason = 'Produto indisponível ou não localizado na API parceira.';
          }
        }

        // 3. Validação de URL e Imagem
        if (!shouldDelete) {
          if (!product.original_url || !product.original_url.startsWith('http')) {
            shouldDelete = true;
            deleteReason = 'URL original do anúncio inválida.';
          } else if (!product.image_url || !product.image_url.startsWith('http')) {
            shouldDelete = true;
            deleteReason = 'Imagem do produto ausente ou inválida.';
          } else if (marketplaceSlug === 'shopee' && !isOfficialShopeeAffiliateUrl((product as any).affiliate_url)) {
            shouldDelete = true;
            deleteReason = 'Link da Shopee não é um offerLink oficial de afiliado.';
          }
        }

        if (shouldDelete) {
          console.warn(`[VerifierAgent] Excluindo produto "${product.name}" (${marketplaceSlug}): ${deleteReason}`);
          const deleted = await deleteProductSafely(product.id);
          if (deleted) {
            report.deletedCount += 1;
            report.deletedProducts.push({
              id: product.id,
              name: product.name,
              externalProductId: externalId,
              marketplaceSlug,
              reason: deleteReason,
            });
          }
        } else {
          // Produto saudável: atualiza last_synced_at
          await supabase
            .from('products')
            .update({ last_synced_at: new Date().toISOString() })
            .eq('id', product.id);

          report.healthyCount += 1;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        report.errors.push(`${product.name.slice(0, 30)}: ${message}`);
      }
    }

    // Limpeza de categorias que possam ter ficado sem nenhum produto
    if (report.deletedCount > 0) {
      try {
        const { data: emptyCats } = await supabase
          .from('categories')
          .select('id, name, products(count)');

        for (const cat of emptyCats || []) {
          const count = (cat as any).products?.[0]?.count ?? 0;
          if (count === 0) {
            await supabase.from('categories').delete().eq('id', cat.id);
          }
        }
      } catch (catCleanErr) {
        console.warn('[VerifierAgent] Aviso ao limpar categorias vazias:', catCleanErr);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    report.errors.push(`Erro geral do agente: ${message}`);
  }

  report.finishedAt = new Date().toISOString();
  return report;
}
