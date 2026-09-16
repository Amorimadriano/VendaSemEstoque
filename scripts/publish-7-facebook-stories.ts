import { getSupabase } from '../lib/supabase';
import { publishApprovedFacebookStory } from '../services/facebookPublisher';

async function main() {
  const supabase = getSupabase();
  const { data: published, error: publishedError } = await supabase
    .from('marketing_content')
    .select('product_id')
    .eq('channel', 'facebook')
    .eq('content_type', 'STORY')
    .eq('status', 'PUBLISHED');
  if (publishedError) throw publishedError;

  const publishedProductIds = new Set((published || []).map((item) => item.product_id));
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, image_url')
    .eq('status', 'ACTIVE')
    .not('image_url', 'is', null)
    .order('popularity_score', { ascending: false })
    .limit(50);
  if (productsError) throw productsError;

  const eligible = (products || []).filter((product) => !publishedProductIds.has(product.id)).slice(0, 7);
  if (!eligible.length) throw new Error('Nenhum produto elegível e inédito encontrado para Stories.');

  let successCount = 0;
  for (const product of eligible) {
    const contentId = crypto.randomUUID();
    const now = new Date().toISOString();
    const { error: insertError } = await supabase.from('marketing_content').insert({
      id: contentId,
      product_id: product.id,
      channel: 'facebook',
      content_type: 'STORY',
      hook: `Confira ${product.name}`,
      caption: 'Oferta e disponibilidade atualizadas na loja parceira.',
      script: 'Story de produto com imagem e chamada para ação.',
      cta: 'Veja os detalhes da oferta.',
      status: 'APPROVED',
      created_at: now,
      updated_at: now,
    });
    if (insertError) {
      console.error(`Falha ao preparar ${product.name}: ${insertError.message}`);
      continue;
    }

    try {
      const result = await publishApprovedFacebookStory(contentId);
      console.log(`Story publicado: ${result.externalPostId}`);
      successCount += 1;
    } catch (error) {
      console.error(`Falha ao publicar Story de ${product.name}:`, error instanceof Error ? error.message : String(error));
    }
  }

  console.log(`Resumo: ${successCount}/${eligible.length} Stories publicados no Facebook.`);
}

main().catch((error) => {
  console.error('Erro geral:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});