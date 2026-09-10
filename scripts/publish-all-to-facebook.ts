import { getSupabase } from '../lib/supabase';
import { generateContentDraftForProduct } from '../services/contentDraftGenerator';
import { publishApprovedFacebookContent } from '../services/facebookPublisher';

const POST_DELAY_MS = Number(process.env.FACEBOOK_POST_DELAY_MS || 120000);
const BATCH_COOLDOWN_MS = Number(process.env.FACEBOOK_BATCH_COOLDOWN_MS || 600000);
const BATCH_SIZE = 1;

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('=== INICIANDO FILA SEGURA DE PUBLICAÇÃO NO FACEBOOK ===');
  console.log(`Ajuste de taxa: ${POST_DELAY_MS / 1000}s entre posts e ${BATCH_COOLDOWN_MS / 60000}min após cada lote.`);

  const supabase = getSupabase();

  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id, name, image_url, marketplace:marketplaces(name, slug)')
    .eq('status', 'ACTIVE');

  if (prodErr) throw prodErr;
  console.log(`Total de produtos ativos encontrados: ${products?.length || 0}`);

  const { data: publishedContents, error: pubErr } = await supabase
    .from('marketing_content')
    .select('product_id, status')
    .eq('channel', 'facebook')
    .eq('status', 'PUBLISHED');

  if (pubErr) throw pubErr;
  const publishedProductIds = new Set((publishedContents || []).map((c) => c.product_id));
  console.log(`Produtos já publicados anteriormente: ${publishedProductIds.size}`);

  const unpublishedProducts = (products || []).filter((p) => !publishedProductIds.has(p.id));
  console.log(`Produtos pendentes para publicação no Facebook: ${unpublishedProducts.length}`);

  let successCount = 0;
  let failedCount = 0;

  for (let index = 0; index < unpublishedProducts.length; index++) {
    const product = unpublishedProducts[index];
    console.log(`\n--- Processando produto ${index + 1}/${unpublishedProducts.length}: [${(product as any).marketplace?.name}] ${product.name.slice(0, 45)}... ---`);

    try {
      let { data: draft } = await supabase
        .from('marketing_content')
        .select('id, status')
        .eq('product_id', product.id)
        .eq('channel', 'facebook')
        .maybeSingle();

      if (!draft) {
        console.log('-> Gerando rascunho para Facebook...');
        draft = await generateContentDraftForProduct(product.id, 'facebook', 'POST');
      }

      if (!draft || !draft.id) {
        throw new Error('Não foi possível obter ou criar rascunho para publicação no Facebook.');
      }

      if (draft.status !== 'APPROVED') {
        console.log(`-> Aprovando conteúdo (ID: ${draft.id})...`);
        const { error: appErr } = await supabase
          .from('marketing_content')
          .update({ status: 'APPROVED', updated_at: new Date().toISOString() })
          .eq('id', draft.id);
        if (appErr) throw appErr;
      }

      console.log('-> Publicando na Página do Facebook...');
      const result = await publishApprovedFacebookContent(draft.id);
      console.log(`-> Sucesso! Publicado no Facebook com Post ID: ${result.externalPostId}`);
      successCount++;

      const shouldPauseForBatch = (index + 1) % BATCH_SIZE === 0 && index < unpublishedProducts.length - 1;
      if (shouldPauseForBatch) {
        console.log(`-> Pausa de lote ativada: aguardando ${BATCH_COOLDOWN_MS / 60000} minutos para respeitar o limite da Meta...`);
        await wait(BATCH_COOLDOWN_MS);
      } else if (index < unpublishedProducts.length - 1) {
        console.log(`-> Pausando ${POST_DELAY_MS / 1000}s antes do próximo item...`);
        await wait(POST_DELAY_MS);
      }
    } catch (err: any) {
      failedCount++;
      const message = err instanceof Error ? err.message : String(err);
      console.error('-> Erro ao processar publicação:', message);

      if (/limit|rate|spam|tempo/i.test(message)) {
        console.warn('-> Bloqueio de frequência detectado pela Meta. Encerrando fila por segurança.');
        break;
      }
    }
  }

  console.log(`\n=== RESUMO FINAL ===`);
  console.log(`- Publicados com sucesso no Facebook: ${successCount}`);
  console.log(`- Falhas: ${failedCount}`);
}

main().catch(console.error);
