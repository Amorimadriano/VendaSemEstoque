import { getSupabase } from '../lib/supabase';
import { deleteProductSafely } from '../services/productPartnerVerifierAgent';

async function removeAmazonProducts() {
  console.log('🧹 Removendo produtos da Amazon desatualizados do banco de dados...');
  const supabase = getSupabase();

  const { data: mkt } = await supabase
    .from('marketplaces')
    .select('id')
    .eq('slug', 'amazon')
    .maybeSingle();

  if (!mkt) {
    console.log('Nenhum marketplace Amazon encontrado.');
    return;
  }

  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, external_product_id')
    .eq('marketplace_id', mkt.id);

  if (error) {
    console.error('Erro ao buscar produtos Amazon:', error);
    return;
  }

  console.log(`Encontrados ${products.length} produtos da Amazon.`);

  for (const prod of products) {
    console.log(`Removendo: ${prod.name} (${prod.external_product_id})...`);
    await deleteProductSafely(prod.id);
  }

  console.log('✅ Todos os produtos obsoletos da Amazon foram removidos com sucesso!');
}

removeAmazonProducts().catch(console.error);
