import { getSupabase } from '../lib/supabase';
import { getMarketplaceIntegration } from '../integrations';
import { deleteProductSafely } from '../services/productPartnerVerifierAgent';

async function main() {
  console.log('🧹 ================================================================');
  console.log('🧹 REMOÇÃO DE PRODUTOS INEXISTENTES E OBSOLETOS: SHOPEE & AMAZON');
  console.log('🧹 ================================================================\n');

  const supabase = getSupabase();

  // 1. Obter IDs dos marketplaces Shopee e Amazon
  const { data: marketplaces, error: mktErr } = await supabase
    .from('marketplaces')
    .select('id, slug, name')
    .in('slug', ['shopee', 'amazon']);

  if (mktErr) throw mktErr;

  const mktIds = (marketplaces || []).map((m) => m.id);
  if (mktIds.length === 0) {
    console.log('Nenhum marketplace Shopee ou Amazon encontrado.');
    return;
  }

  // 2. Buscar todos os produtos desses marketplaces
  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id, name, external_product_id, original_url, affiliate_url, image_url, status, price, marketplace_id, marketplace:marketplaces(slug, name)')
    .in('marketplace_id', mktIds);

  if (prodErr) throw prodErr;

  console.log(`🔍 Total de produtos encontrados no banco (Shopee & Amazon): ${products?.length || 0}\n`);

  const deleted: any[] = [];
  const kept: any[] = [];

  for (const product of products || []) {
    const marketplaceSlug = (product as any).marketplace?.slug;
    const externalId = product.external_product_id;

    if (!marketplaceSlug || !externalId) {
      console.log(`🗑️ Removendo [${marketplaceSlug || 'DESCONHECIDO'}] ${product.name} (sem identificador válido)`);
      await deleteProductSafely(product.id);
      deleted.push({ name: product.name, slug: marketplaceSlug, reason: 'Identificador ausente' });
      continue;
    }

    const integration = getMarketplaceIntegration(marketplaceSlug);
    let shouldDelete = false;
    let deleteReason = '';

    // Se o produto está expressamente marcado como fora de estoque
    if (product.status === 'OUT_OF_STOCK') {
      shouldDelete = true;
      deleteReason = 'Produto fora de estoque / inativo no catálogo.';
    } else {
      // Verificar integridade com a integração
      const check = await integration.verifyProduct(externalId);
      if (check.status === 'NOT_FOUND') {
        shouldDelete = true;
        deleteReason = check.reason || 'Produto não encontrado na base parceira.';
      } else if (!product.image_url || !product.image_url.startsWith('http')) {
        shouldDelete = true;
        deleteReason = 'Imagem inválida ou ausente.';
      } else if (!product.original_url || !product.original_url.startsWith('http')) {
        shouldDelete = true;
        deleteReason = 'URL do produto inválida.';
      }
    }

    if (shouldDelete) {
      console.log(`🗑️ Removendo [${marketplaceSlug.toUpperCase()}] ${product.name.slice(0, 55)}... | Motivo: ${deleteReason}`);
      const success = await deleteProductSafely(product.id);
      if (success) {
        deleted.push({ name: product.name, slug: marketplaceSlug, externalId, reason: deleteReason });
      }
    } else {
      console.log(`✅ Mantendo ativo [${marketplaceSlug.toUpperCase()}] ${product.name.slice(0, 55)}... (R$ ${product.price})`);
      kept.push({ name: product.name, slug: marketplaceSlug, externalId, price: product.price });
    }
  }

  // 3. Limpar categorias vazias que possam ter sobrado
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, products(count)');

  for (const cat of categories || []) {
    const count = (cat as any).products?.[0]?.count ?? 0;
    if (count === 0) {
      console.log(`🧹 Removendo categoria vazia: ${cat.name}`);
      await supabase.from('categories').delete().eq('id', cat.id);
    }
  }

  console.log('\n📊 === RELATÓRIO FINAL ===');
  console.log(`- Produtos removidos (inexistentes/inativos): ${deleted.length}`);
  console.log(`- Produtos mantidos ativos e verificados: ${kept.length}`);
  console.log(`  * Shopee ativos: ${kept.filter((p) => p.slug === 'shopee').length}`);
  console.log(`  * Amazon ativos: ${kept.filter((p) => p.slug === 'amazon').length}`);
}

main().catch(console.error);
