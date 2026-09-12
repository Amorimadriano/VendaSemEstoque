import { getSupabase } from '../lib/supabase';
import { createCreatomateVideo, refreshCreatomateVideo } from '../services/creatomateVideo';
import { publishApprovedFacebookReelContent } from '../services/facebookPublisher';

async function wait(milliseconds: number) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function main() {
  console.log('=== INICIANDO PUBLICAÇÃO DE 3 REELS NO FACEBOOK ===');

  const supabase = getSupabase();

  // 1. Verificar se já temos vídeos renderizados prontos no sistema
  const { data: availableVideos, error: vidErr } = await supabase
    .from('marketing_videos')
    .select('id, content_id, video_url, status')
    .in('status', ['succeeded', 'SUCCEEDED', 'FINISHED', 'COMPLETED'])
    .not('video_url', 'is', null);

  if (vidErr) throw vidErr;
  console.log(`Vídeos renderizados disponíveis no banco: ${availableVideos?.length || 0}`);

  // 2. Verificar publicações existentes no Facebook
  const { data: publishedFb, error: pubFbErr } = await supabase
    .from('marketing_content')
    .select('product_id')
    .eq('channel', 'facebook')
    .eq('status', 'PUBLISHED');

  if (pubFbErr) throw pubFbErr;
  const publishedProductIds = new Set((publishedFb || []).map((item) => item.product_id));
  console.log(`Produtos já publicados no Facebook anteriormente: ${publishedProductIds.size}`);

  let successCount = 0;

  // Prioridade 1: Utilizar vídeos já renderizados com sucesso que ainda não foram postados no Facebook
  if (availableVideos && availableVideos.length > 0) {
    for (const video of availableVideos) {
      if (successCount >= 3) break;

      // Buscar o produto associado ao conteúdo original
      const { data: origContent } = await supabase
        .from('marketing_content')
        .select('product_id, hook, caption, script, cta')
        .eq('id', video.content_id)
        .maybeSingle();

      if (!origContent || publishedProductIds.has(origContent.product_id)) {
        continue;
      }

      const { data: product } = await supabase
        .from('products')
        .select('id, name, status, marketplace:marketplaces(name)')
        .eq('id', origContent.product_id)
        .maybeSingle();

      if (!product || product.status !== 'ACTIVE') continue;

      const fbContentId = crypto.randomUUID();
      const now = new Date().toISOString();
      const shortName = product.name.length > 90 ? `${product.name.slice(0, 87)}...` : product.name;
      const marketName = (product as any).marketplace?.name || 'loja parceira';

      console.log(`\n[${successCount + 1}/3] Preparando Reel para: ${shortName}`);

      // Criar conteúdo aprovado para Facebook
      const { error: insErr } = await supabase.from('marketing_content').insert({
        id: fbContentId,
        product_id: product.id,
        channel: 'facebook',
        content_type: 'REEL',
        hook: origContent.hook || `O que vale conferir em ${shortName} antes de escolher?`,
        caption: origContent.caption || `Confira as principais informações e especificações de ${shortName}. Consulte condições e disponibilidade diretamente na ${marketName}.`,
        script: origContent.script || `Reel de 15s com detalhes de ${shortName}.`,
        cta: origContent.cta || `Veja todos os detalhes na ${marketName}.`,
        status: 'APPROVED',
        created_at: now,
        updated_at: now,
      });

      if (insErr) {
        console.error('-> Erro ao criar conteúdo:', insErr.message);
        continue;
      }

      // Associar o vídeo renderizado a este novo conteúdo do Facebook
      const { error: vidInsErr } = await supabase.from('marketing_videos').insert({
        id: crypto.randomUUID(),
        content_id: fbContentId,
        provider_render_id: `reused_${video.id}`,
        status: 'SUCCEEDED',
        video_url: video.video_url,
        created_at: now,
        updated_at: now,
      });

      if (vidInsErr) {
        console.error('-> Erro ao vincular vídeo:', vidInsErr.message);
        continue;
      }

      try {
        console.log('-> Publicando Reel no Facebook via Graph API...');
        const result = await publishApprovedFacebookReelContent(fbContentId);
        console.log(`-> Sucesso! Reel publicado com Post ID: ${result.externalPostId}`);
        publishedProductIds.add(product.id);
        successCount += 1;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`-> Falha ao publicar Reel: ${message}`);
        await supabase
          .from('marketing_content')
          .update({ publication_error: message, updated_at: new Date().toISOString() })
          .eq('id', fbContentId);
      }

      if (successCount < 3) {
        console.log('-> Aguardando 10s antes do próximo envio...');
        await wait(10000);
      }
    }
  }

  // Prioridade 2: Se ainda faltarem Reels para completar os 3, tentar renderizar novos
  if (successCount < 3) {
    console.log(`\nBuscando novos produtos para completar ${3 - successCount} Reel(s)...`);

    const { data: products } = await supabase
      .from('products')
      .select('id, name, image_url, marketplace:marketplaces(name)')
      .eq('status', 'ACTIVE')
      .not('image_url', 'is', null)
      .limit(20);

    const pending = (products || []).filter((p) => !publishedProductIds.has(p.id));

    for (const product of pending) {
      if (successCount >= 3) break;

      const contentId = crypto.randomUUID();
      const now = new Date().toISOString();
      const shortName = product.name.length > 90 ? `${product.name.slice(0, 87)}...` : product.name;
      const marketName = (product as any).marketplace?.name || 'loja parceira';

      console.log(`\n[${successCount + 1}/3] Tentando gerar novo Reel: ${shortName}`);

      await supabase.from('marketing_content').insert({
        id: contentId,
        product_id: product.id,
        channel: 'facebook',
        content_type: 'REEL',
        hook: `O que vale conferir em ${shortName} antes de comprar?`,
        caption: `Confira os principais detalhes e especificações. Consulte preço e disponibilidade atualizados na ${marketName}.`,
        script: `0-3s: Gancho.\n4-10s: Benefícios.\n11-15s: CTA na ${marketName}.`,
        cta: `Veja os detalhes na ${marketName}.`,
        status: 'APPROVED',
        created_at: now,
        updated_at: now,
      });

      try {
        const render = await createCreatomateVideo(contentId);
        let ready = false;
        for (let attempt = 0; attempt < 12; attempt += 1) {
          await wait(5000);
          const status = await refreshCreatomateVideo(contentId);
          if (['SUCCEEDED', 'FINISHED', 'COMPLETED'].includes(String(status.status).toUpperCase()) && status.videoUrl) {
            ready = true;
            break;
          }
          if (String(status.status).toLowerCase() === 'failed') break;
        }

        if (ready) {
          const result = await publishApprovedFacebookReelContent(contentId);
          console.log(`-> Sucesso! Reel publicado com Post ID: ${result.externalPostId}`);
          publishedProductIds.add(product.id);
          successCount += 1;
        }
      } catch (err) {
        console.error('-> Erro ao gerar vídeo:', err instanceof Error ? err.message : String(err));
      }

      if (successCount < 3) await wait(10000);
    }
  }

  console.log(`\n=== RESUMO FINAL ===`);
  console.log(`- Total de Reels publicados no Facebook: ${successCount}/3`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

