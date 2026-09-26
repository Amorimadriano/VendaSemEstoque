import { getSupabase } from '@/lib/supabase';
import { getMarketplaceIntegration } from '@/integrations';

export interface HealthCheckResult {
  checked: number;
  healthy: number;
  markedOutOfStock: number;
  errors: string[];
}

export async function runAffiliateHealthCheck(batchSize = 25): Promise<HealthCheckResult> {
  const supabase = getSupabase();
  const stats: HealthCheckResult = {
    checked: 0,
    healthy: 0,
    markedOutOfStock: 0,
    errors: [],
  };

  // Buscar produtos ativos com verificação mais antiga
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, external_product_id, marketplace:marketplaces(slug), status, last_synced_at')
    .eq('status', 'ACTIVE')
    .order('last_synced_at', { ascending: true, nullsFirst: true })
    .limit(batchSize);

  if (error) throw error;
  if (!products || products.length === 0) return stats;

  stats.checked = products.length;

  for (const product of products) {
    const marketplaceSlug = (product as any).marketplace?.slug;
    if (!marketplaceSlug || !product.external_product_id) continue;

    try {
      const integration = getMarketplaceIntegration(marketplaceSlug);
      
      if (typeof (integration as any).verifyProduct === 'function') {
        const result = await (integration as any).verifyProduct(product.external_product_id);
        if (marketplaceSlug !== 'shopee' && result.status === 'NOT_FOUND') {
          await supabase
            .from('products')
            .update({ status: 'OUT_OF_STOCK', last_synced_at: new Date().toISOString() })
            .eq('id', product.id);
          stats.markedOutOfStock += 1;
          continue;
        }
      }

      // Atualiza last_synced_at para manter a fila rotativa
      await supabase
        .from('products')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', product.id);

      stats.healthy += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      stats.errors.push(`${product.name.slice(0, 30)}: ${message}`);
    }
  }

  return stats;
}
