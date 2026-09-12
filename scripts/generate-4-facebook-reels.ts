import { getSupabase } from '../lib/supabase';
import { createFfmpegProductVideoAndUpload } from '../services/ffmpegVideoGenerator';
import { publishApprovedFacebookReelContent } from '../services/facebookPublisher';

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('=== INICIANDO GERAÇÃO E PUBLICAÇÃO DE 4 REELS NO FACEBOOK COM FFMPEG ===\n');

  const supabase = getSupabase();

  // 1. Buscar produtos ativos com imagem pública
  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id, name, brand, image_url, key_benefits, marketplace:marketplaces(name)')
    .eq('status', 'ACTIVE')
    .not('image_url', 'is', null)
    .order('popularity_score', { ascending: false })
    .limit(50);

  if (prodErr) throw prodErr;

  // 2. Filtrar produtos que já foram publicados no Facebook como REEL
  const { data: publishedFb, error: pubFbErr } = await supabase
    .from('marketing_content')
    .select('product_id')
    .eq('channel', 'facebook')
    .eq('status', 'PUBLISHED');

  if (pubFbErr) throw pubFbErr;
  const publishedProductIds = new Set((publishedFb || []).map((item) => item.product_id));

  const eligible = (products || []).filter((p) => !publishedProductIds.has(p.id)).slice(0, 4);

  if (eligible.length < 4) {
    console.log(`Aviso: Encontrados ${eligible.length} produtos totalmente inéditos no Facebook.`);
  }

  console.log(`Total de produtos selecionados: ${eligible.length}`);
  let successCount = 0;

  for (let index = 0; index < eligible.length; index++) {
    const product = eligible[index];
    const contentId = crypto.randomUUID();
    const now = new Date().toISOString();
    const shortName = product.name.length > 70 ? `${product.name.slice(0, 67)}...` : product.name;
    const marketName = (product as any).marketplace?.name || 'loja parceira';
    const benefit = product.key_benefits || 'detalhes verificados que ajudam na decisão de compra';

    console.log(`\n================================================================`);
    console.log(`[${index + 1}/${eligible.length}] Processando: [${marketName}] ${shortName}`);
    console.log(`================================================================`);

    const hook = `O que vale conferir em ${shortName} antes de escolher?`;
    const caption = `Pesquisando ${product.name}? Confira ${benefit}. Consulte disponibilidade e condições atualizadas diretamente na ${marketName}.`;
    const script = `0-3s: Gancho.\n4-10s: Recursos e benefícios.\n11-15s: CTA para conferir na ${marketName}.`;
    const cta = `Veja as condições na ${marketName}.`;

    // 1. Criar registro de marketing_content no Supabase
    const { error: insErr } = await supabase.from('marketing_content').insert({
      id: contentId,
      product_id: product.id,
      channel: 'facebook',
      content_type: 'REEL',
      hook,
      caption,
      script,
      cta,
      status: 'APPROVED',
      created_at: now,
      updated_at: now,
    });

    if (insErr) {
      console.error(`-> Erro ao criar rascunho de conteúdo:`, insErr.message);
      continue;
    }

    try {
      // 2. Gerar vídeo vertical MP4 com FFmpeg e subir para o Supabase Storage
      console.log('-> Renderizando vídeo MP4 vertical 1080x1920 com FFmpeg...');
      const startTime = Date.now();
      const videoResult = await createFfmpegProductVideoAndUpload(contentId);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`-> ✅ Vídeo gerado e enviado ao Storage em ${elapsed}s!`);
      console.log(`-> URL do vídeo: ${videoResult.videoUrl}`);

      // 3. Publicar Reel no Facebook via Graph API
      console.log('-> Publicando Reel no Facebook via Graph API...');
      const publishResult = await publishApprovedFacebookReelContent(contentId);
      console.log(`-> 🚀 Sucesso! Reel publicado no Facebook. Post/Video ID: ${publishResult.externalPostId}`);
      successCount++;
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`-> ❌ Falha:`, msg);
      await supabase
        .from('marketing_content')
        .update({ publication_error: msg, updated_at: new Date().toISOString() })
        .eq('id', contentId);
    }

    if (index < eligible.length - 1) {
      console.log('-> Aguardando 10s para respeitar as diretrizes de envio da Meta...');
      await wait(10000);
    }
  }

  console.log(`\n================================================================`);
  console.log(`=== RESUMO FINAL: ${successCount}/${eligible.length} REELS PUBLICADOS COM FFMPEG ===`);
  console.log(`================================================================\n`);
}

main().catch((err) => {
  console.error('Erro fatal:', err);
  process.exitCode = 1;
});
