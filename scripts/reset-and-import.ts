import { getMarketplaceIntegration } from '../integrations';
import { getSupabase } from '../lib/supabase';
import { formatSyncError, PRODUCT_SYNC_MARKETPLACES, upsertProduct, validateCandidateProduct } from '../services/productDiscovery';
import { ExternalProduct } from '../types';

async function main() {
  const supabase = getSupabase();
  const searches = (process.env.PRODUCT_SEARCHES || 'eletronicos,celular,fones,notebook,smart tv,casa').split(',').map((term) => term.trim()).filter(Boolean);
  const candidates = new Map<string, Map<string, ExternalProduct>>();

  // Stage live API data before deleting anything, so API outages keep the current catalog intact.
  for (const slug of PRODUCT_SYNC_MARKETPLACES) {
    const integration = getMarketplaceIntegration(slug);
    const products = new Map<string, ExternalProduct>();
    for (const search of slug === 'shopee' ? [undefined] : searches) {
      for (const product of await integration.getProducts(search, undefined, 50)) {
        const validation = validateCandidateProduct(product, slug);
        if (validation.isValid) products.set(product.externalProductId, product);
        else console.warn(`[${slug}] ${product.externalProductId}: ${validation.reason}`);
      }
    }
    if (!products.size) throw new Error(`Nenhum produto atual aprovado para ${slug}. Exclusão cancelada.`);
    candidates.set(slug, products);
    console.log(`[${slug}] ${products.size} produtos atuais preparados para importação.`);
  }

  const { count: before, error: countError } = await supabase.from('products').select('id', { count: 'exact', head: true });
  if (countError) throw countError;
  const { count: conversions, error: conversionsError } = await supabase.from('conversions').select('id', { count: 'exact', head: true });
  if (conversionsError) throw conversionsError;
  if (conversions) throw new Error('Existem conversões financeiras vinculadas. Exclusão cancelada para preservar o histórico.');
  console.log(`Removendo ${before} produtos antigos e registros vinculados...`);

  const { error: amazonError } = await supabase.from('marketplaces')
    .update({ api_status: 'INACTIVE', affiliate_status: 'INACTIVE', updated_at: new Date().toISOString() })
    .eq('slug', 'amazon');
  if (amazonError) throw amazonError;

  const { error: deleteError } = await supabase.from('products').delete().not('id', 'is', null);
  if (deleteError) throw deleteError;
  const { count: remaining, error: remainingError } = await supabase.from('products').select('id', { count: 'exact', head: true });
  if (remainingError) throw remainingError;
  if (remaining !== 0) throw new Error(`Exclusão incompleta: ${remaining} produtos restantes.`);
  console.log('Catálogo antigo removido. Importando somente AliExpress e Shopee...');

  let published = 0;
  const errors: string[] = [];
  for (const [slug, products] of candidates) {
    let imported = 0;
    for (const product of products.values()) {
      try {
        await upsertProduct(product, slug);
        imported += 1;
      } catch (error) {
        const message = `[${slug}/${product.externalProductId}] ${formatSyncError(error)}`;
        console.error(message);
        errors.push(message);
      }
    }
    published += imported;
    console.log(`[${slug}] ${imported}/${products.size} produtos importados.`);
  }

  const { count: after, error: afterError } = await supabase.from('products').select('id', { count: 'exact', head: true });
  if (afterError) throw afterError;
  if (after !== published) throw new Error(`Contagem divergente: ${published} importados, ${after} no banco.`);
  if (errors.length) throw new Error(`${errors.length} falhas de importação; ${published} produtos salvos.`);
  console.log(`Renovação concluída: ${before} produtos antigos removidos, ${after} produtos atuais importados.`);
}

main().catch((error) => {
  console.error('Falha na renovação do catálogo:', formatSyncError(error));
  process.exitCode = 1;
});
