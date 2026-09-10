import { getSupabase } from '../lib/supabase';
import { generateContentDraftForProduct } from '../services/contentDraftGenerator';
import { publishApprovedInstagramContent } from '../services/instagramPublisher';

const POST_DELAY_MS = Number(process.env.INSTAGRAM_POST_DELAY_MS || 600000);
const BATCH_COOLDOWN_MS = Number(process.env.INSTAGRAM_BATCH_COOLDOWN_MS || 3600000);
const BATCH_SIZE = Number(process.env.INSTAGRAM_BATCH_SIZE || 5);

async function wait(milliseconds: number) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function main() {
  console.log('=== INICIANDO FILA DE PUBLICAÇÃO NO INSTAGRAM ===');
  console.log(`Intervalo: ${POST_DELAY_MS / 60000}min entre posts; pausa de ${BATCH_COOLDOWN_MS / 60000}min a cada ${BATCH_SIZE} itens.`);

  const supabase = getSupabase();
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, image_url, marketplace:marketplaces(name, slug)')
    .eq('status', 'ACTIVE');
  if (productsError) throw productsError;

  const { data: publishedContents, error: publishedError } = await supabase
    .from('marketing_content')
    .select('product_id')
    .eq('channel', 'instagram')
    .eq('status', 'PUBLISHED');
  if (publishedError) throw publishedError;

  const publishedProductIds = new Set((publishedContents || []).map((content) => content.product_id));
  const pendingProducts = (products || []).filter((product) => !publishedProductIds.has(product.id));
  console.log(`Produtos ativos: ${products?.length || 0}`);
  console.log(`Produtos pendentes no Instagram: ${pendingProducts.length}`);

  let successCount = 0;
  let failedCount = 0;

  for (let index = 0; index < pendingProducts.length; index += 1) {
    const product = pendingProducts[index];
    console.log(`\n--- ${index + 1}/${pendingProducts.length}: ${product.name.slice(0, 70)} ---`);

    try {
      const { data: existingContent, error: contentError } = await supabase
        .from('marketing_content')
        .select('id, status')
        .eq('product_id', product.id)
        .eq('channel', 'instagram')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (contentError) throw contentError;

      let content = existingContent;
      if (!content) {
        console.log('-> Gerando conteúdo para Instagram...');
        content = await generateContentDraftForProduct(product.id, 'instagram', 'POST');
      }
      if (!content?.id) throw new Error('Não foi possível obter o conteúdo do Instagram.');

      if (content.status !== 'APPROVED') {
        const { error: approvalError } = await supabase
          .from('marketing_content')
          .update({ status: 'APPROVED', updated_at: new Date().toISOString() })
          .eq('id', content.id);
        if (approvalError) throw approvalError;
      }

      const result = await publishApprovedInstagramContent(content.id);
      console.log(`-> Publicado com sucesso. Instagram ID: ${result.externalPostId}`);
      successCount += 1;

      if (index < pendingProducts.length - 1) {
        if ((successCount % BATCH_SIZE) === 0) {
          console.log(`-> Pausa de lote: ${BATCH_COOLDOWN_MS / 60000}min.`);
          await wait(BATCH_COOLDOWN_MS);
        } else {
          console.log(`-> Aguardando ${POST_DELAY_MS / 60000}min antes do próximo.`);
          await wait(POST_DELAY_MS);
        }
      }
    } catch (error) {
      failedCount += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`-> Falha: ${message}`);
      if (/limit|rate|spam|quota|permission/i.test(message)) {
        console.warn('-> Limite ou permissão da Meta detectado. Encerrando a fila.');
        break;
      }
    }
  }

  console.log('\n=== RESUMO ===');
  console.log(`Publicados no Instagram: ${successCount}`);
  console.log(`Falhas: ${failedCount}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
