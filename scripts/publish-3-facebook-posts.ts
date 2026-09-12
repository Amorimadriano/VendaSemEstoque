import { getSupabase } from '../lib/supabase';
import { generateContentDraftForProduct } from '../services/contentDraftGenerator';
import { publishApprovedFacebookContent } from '../services/facebookPublisher';

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('=== INICIANDO PUBLICAÇÃO DE 3 POSTS NO FACEBOOK ===');

  const supabase = getSupabase();

  // 1. Buscar produtos ativos com imagem válida ordenados por pontuação
  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id, name, image_url, key_benefits, marketplace:marketplaces(name)')
    .eq('status', 'ACTIVE')
    .not('image_url', 'is', null)
    .order('popularity_score', { ascending: false })
    .limit(40);

  if (prodErr) throw prodErr;

  // 2. Filtrar produtos já publicados anteriormente no Facebook
  const { data: publishedContents, error: pubErr } = await supabase
    .from('marketing_content')
    .select('product_id')
    .eq('channel', 'facebook')
    .eq('status', 'PUBLISHED');

  if (pubErr) throw pubErr;
  const publishedProductIds = new Set((publishedContents || []).map((c) => c.product_id));

  const eligibleProducts = (products || []).filter((p) => !publishedProductIds.has(p.id)).slice(0, 3);

  if (!eligibleProducts.length) {
    throw new Error('Nenhum produto elegível e inédito encontrado para publicação no Facebook.');
  }

  console.log(`Produtos selecionados para os 3 posts: ${eligibleProducts.length}`);
  let successCount = 0;

  for (let index = 0; index < eligibleProducts.length; index++) {
    const product = eligibleProducts[index];
    const marketName = (product as any).marketplace?.name || 'loja parceira';
    const shortName = product.name.length > 80 ? `${product.name.slice(0, 77)}...` : product.name;

    console.log(`\n[${index + 1}/${eligibleProducts.length}] Processando: [${marketName}] ${shortName}`);

    try {
      let { data: draft } = await supabase
        .from('marketing_content')
        .select('id, status')
        .eq('product_id', product.id)
        .eq('channel', 'facebook')
        .maybeSingle();

      if (!draft) {
        console.log('-> Gerando rascunho de post para Facebook...');
        draft = await generateContentDraftForProduct(product.id, 'facebook', 'POST');
      }

      if (!draft?.id) {
        throw new Error('Falha ao obter rascunho de conteúdo.');
      }

      if (draft.status !== 'APPROVED') {
        console.log(`-> Aprovando conteúdo (ID: ${draft.id})...`);
        const { error: appErr } = await supabase
          .from('marketing_content')
          .update({ status: 'APPROVED', updated_at: new Date().toISOString() })
          .eq('id', draft.id);
        if (appErr) throw appErr;
      }

      console.log('-> Enviando post com imagem e link oficial para o Facebook...');
      const result = await publishApprovedFacebookContent(draft.id);
      console.log(`-> Sucesso! Publicado no Facebook com Post ID: ${result.externalPostId}`);
      successCount++;

      if (index < eligibleProducts.length - 1) {
        console.log('-> Aguardando 10s para respeitar as diretrizes de taxa da Meta...');
        await wait(10000);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('-> Erro ao publicar post:', msg);
    }
  }

  console.log(`\n=== RESUMO FINAL ===`);
  console.log(`- Posts publicados no Facebook com sucesso: ${successCount}/${eligibleProducts.length}`);
}

main().catch((err) => {
  console.error('Erro geral:', err);
  process.exitCode = 1;
});
