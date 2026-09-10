import { getSupabase } from '../lib/supabase';
import { createCreatomateVideo, refreshCreatomateVideo } from '../services/creatomateVideo';
import { publishApprovedInstagramContent } from '../services/instagramPublisher';

async function wait(milliseconds: number) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function main() {
  const token = process.env.META_ACCESS_TOKEN;
  const instagramAccountId = process.env.META_INSTAGRAM_ACCOUNT_ID;
  if (!token || !instagramAccountId) throw new Error('Credenciais do Instagram ausentes.');

  const supabase = getSupabase();
  const { data: oldReels, error: oldError } = await supabase
    .from('marketing_content')
    .select('id, product_id, external_post_id')
    .eq('channel', 'instagram')
    .eq('content_type', 'REEL')
    .eq('status', 'PUBLISHED')
    .not('external_post_id', 'is', null)
    .order('published_at', { ascending: false })
    .limit(3);
  if (oldError) throw oldError;
  if (!oldReels?.length) throw new Error('Nenhum Reel publicado para substituir.');

  for (const reel of oldReels) {
    const deleteUrl = new URL(`https://graph.facebook.com/v26.0/${reel.external_post_id}`);
    deleteUrl.searchParams.set('access_token', token);
    const response = await fetch(deleteUrl, { method: 'DELETE' });
    const result = await response.json().catch(() => ({}));
    if (response.ok && result.success !== false) {
      await supabase.from('marketing_content').update({ status: 'CANCELLED', publication_error: null, updated_at: new Date().toISOString() }).eq('id', reel.id);
      console.log(`Reel antigo removido: ${reel.external_post_id}`);
    } else {
      console.warn(`Não foi possível remover ${reel.external_post_id}: ${result?.error?.message || response.status}`);
    }
  }

  const productIds = oldReels.map((reel) => reel.product_id);
  const { data: products, error: productsError } = await supabase.from('products').select('id,name').in('id', productIds);
  if (productsError) throw productsError;

  let successCount = 0;
  for (const product of products || []) {
    const contentId = crypto.randomUUID();
    const now = new Date().toISOString();
    const shortName = product.name.length > 48 ? `${product.name.slice(0, 45)}...` : product.name;
    const { error: insertError } = await supabase.from('marketing_content').insert({
      id: contentId,
      product_id: product.id,
      channel: 'instagram',
      content_type: 'REEL',
      hook: `Conheça ${shortName}`,
      caption: 'Apresentação rápida com os principais detalhes do produto. Confira informações, preço e disponibilidade atualizados antes de comprar.',
      script: 'Reel vertical criado com layout seguro para leitura em telas mobile.',
      cta: 'Acesse o link na bio para conferir a oferta.',
      status: 'APPROVED',
      created_at: now,
      updated_at: now,
    });
    if (insertError) throw insertError;

    try {
      const render = await createCreatomateVideo(contentId);
      let ready = false;
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const status = await refreshCreatomateVideo(contentId);
        if (status.status.toLowerCase() === 'failed') throw new Error('Render do Creatomate falhou.');
        if (status.status.toLowerCase() === 'succeeded' && status.videoUrl) {
          ready = true;
          break;
        }
        await wait(5000);
      }
      if (!ready) throw new Error(`Render ${render.renderId} não ficou pronto.`);
      const published = await publishApprovedInstagramContent(contentId);
      console.log(`Publicado corrigido: ${product.name} -> ${published.externalPostId}`);
      successCount += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await supabase.from('marketing_content').update({ publication_error: message, updated_at: new Date().toISOString() }).eq('id', contentId);
      console.error(`Falha em ${product.name}: ${message}`);
    }

    await wait(15000);
  }

  console.log(`Resumo: ${successCount}/${products?.length || 0} Reels corrigidos publicados.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
