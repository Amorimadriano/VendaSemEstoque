import { getSupabase } from '../lib/supabase';
import { createCreatomateVideo, refreshCreatomateVideo } from '../services/creatomateVideo';
import { publishApprovedInstagramContent } from '../services/instagramPublisher';

async function wait(milliseconds: number) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function main() {
  const supabase = getSupabase();
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, image_url')
    .eq('status', 'ACTIVE')
    .not('image_url', 'is', null)
    .limit(20);
  if (productsError) throw productsError;

  const { data: published, error: publishedError } = await supabase
    .from('marketing_content')
    .select('product_id')
    .eq('channel', 'instagram')
    .eq('content_type', 'REEL')
    .eq('status', 'PUBLISHED');
  if (publishedError) throw publishedError;

  const publishedProductIds = new Set((published || []).map((item) => item.product_id));
  const selected = (products || []).filter((product) => !publishedProductIds.has(product.id)).slice(0, 3);
  if (!selected.length) throw new Error('Nenhum produto sem Reel publicado foi encontrado.');

  console.log(`Produtos selecionados: ${selected.length}`);
  let successCount = 0;

  for (const [index, product] of selected.entries()) {
    const contentId = crypto.randomUUID();
    const now = new Date().toISOString();
    const shortName = product.name.length > 90 ? `${product.name.slice(0, 87)}...` : product.name;

    const { error: insertError } = await supabase.from('marketing_content').insert({
      id: contentId,
      product_id: product.id,
      channel: 'instagram',
      content_type: 'REEL',
      hook: `Vale a pena conhecer ${shortName}`,
      caption: 'Apresentação rápida com os principais detalhes do produto. Confira informações, preço e disponibilidade atualizados antes de comprar.',
      script: 'Reel vertical criado automaticamente a partir dos dados do produto.',
      cta: 'Acesse o link na bio para conferir a oferta.',
      status: 'APPROVED',
      created_at: now,
      updated_at: now,
    });
    if (insertError) throw insertError;

    try {
      console.log(`\n${index + 1}/${selected.length}: ${product.name}`);
      const render = await createCreatomateVideo(contentId);
      console.log(`Render: ${render.renderId}`);

      let ready = false;
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const status = await refreshCreatomateVideo(contentId);
        console.log(`Status: ${status.status}`);
        if (['SUCCEEDED', 'FINISHED', 'COMPLETED'].includes(status.status.toUpperCase()) && status.videoUrl) {
          ready = true;
          break;
        }
        if (status.status.toLowerCase() === 'failed') throw new Error('Render do Creatomate falhou.');
        await wait(5000);
      }
      if (!ready) throw new Error('Render não ficou pronto no tempo esperado.');

      const result = await publishApprovedInstagramContent(contentId);
      console.log(`Publicado: ${result.externalPostId}`);
      successCount += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Falha: ${message}`);
      await supabase.from('marketing_content').update({ publication_error: message, updated_at: new Date().toISOString() }).eq('id', contentId);
    }

    if (index < selected.length - 1) await wait(15000);
  }

  console.log(`\nResumo: ${successCount}/${selected.length} publicados.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
