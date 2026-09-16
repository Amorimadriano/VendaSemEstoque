import { getSupabase } from '../lib/supabase';
import { createFfmpegProductVideoAndUpload } from '../services/ffmpegVideoGenerator';
import { publishApprovedInstagramContent } from '../services/instagramPublisher';

async function main() {
  console.log('=== INICIANDO PUBLICAÇÃO NO INSTAGRAM ===');

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

  // 2. Verificar produtos já publicados no Instagram
  const { data: publishedIg, error: pubIgErr } = await supabase
    .from('marketing_content')
    .select('product_id')
    .eq('channel', 'instagram')
    .eq('status', 'PUBLISHED');

  if (pubIgErr) throw pubIgErr;
  const publishedProductIds = new Set((publishedIg || []).map((item) => item.product_id));

  const eligible = (products || []).filter((p) => !publishedProductIds.has(p.id));

  if (!eligible.length) {
    throw new Error('Nenhum produto elegível e inédito encontrado para publicação no Instagram.');
  }

  const product = eligible[0];
  const contentId = crypto.randomUUID();
  const now = new Date().toISOString();
  const shortName = product.name.length > 70 ? `${product.name.slice(0, 67)}...` : product.name;
  const marketName = (product as any).marketplace?.name || 'loja parceira';
  const benefit = product.key_benefits || 'detalhes verificados que ajudam na decisão de compra';

  console.log(`\nProduto selecionado: [${marketName}] ${shortName}`);

  const hook = `O que vale conferir em ${shortName} antes de escolher?`;
  const caption = `Pesquisando ${product.name}? Confira ${benefit}. Consulte disponibilidade e condições atualizadas diretamente na ${marketName}.`;
  const script = `Reel vertical informativo sobre ${shortName}.`;
  const cta = `Veja as condições e disponibilidade na ${marketName}.`;

  // 1. Criar registro de marketing_content
  const { error: insErr } = await supabase.from('marketing_content').insert({
    id: contentId,
    product_id: product.id,
    channel: 'instagram',
    content_type: 'REEL',
    hook,
    caption,
    script,
    cta,
    status: 'APPROVED',
    created_at: now,
    updated_at: now,
  });

  if (insErr) throw insErr;

  console.log('-> 1. Renderizando vídeo MP4 com FFmpeg e enviando ao Supabase Storage...');
  const videoResult = await createFfmpegProductVideoAndUpload(contentId);
  console.log(`-> ✅ Vídeo gerado: ${videoResult.videoUrl}`);

  console.log('-> 2. Enviando e publicando Reel no Instagram via Graph API...');
  const publishResult = await publishApprovedInstagramContent(contentId);

  console.log(`\n🎉 SUCESSO! Publicado no Instagram!`);
  console.log(`- External Post ID: ${publishResult.externalPostId}`);
  console.log(`- Cota restante hoje: ${publishResult.remainingCapacity}`);
}

main().catch((err) => {
  console.error('Erro na publicação do Instagram:', err);
  process.exitCode = 1;
});
