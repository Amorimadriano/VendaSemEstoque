import { getSupabase } from '../lib/supabase';
import { generateContentDraftForProduct } from '../services/contentDraftGenerator';
import { createFfmpegProductVideoAndUpload } from '../services/ffmpegVideoGenerator';
import { publishApprovedFacebookReelContent } from '../services/facebookPublisher';
import { publishApprovedInstagramContent } from '../services/instagramPublisher';

type Channel = 'instagram' | 'facebook';
type PendingContent = { id: string; product_id: string; status: string; content_type: string; product?: { name?: string } | null };

const MAX_PER_CHANNEL = Math.max(1, Number(process.env.FFMPEG_MAX_PUBLICATIONS || 2));
const DELAY_MS = Math.max(0, Number(process.env.FFMPEG_POST_DELAY_MS || 15000));

async function wait(milliseconds: number) {
  if (milliseconds > 0) await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function getPendingContent(channel: Channel): Promise<PendingContent[]> {
  const supabase = getSupabase();
  const { data: published, error: publishedError } = await supabase
    .from('marketing_content')
    .select('product_id')
    .eq('channel', channel)
    .eq('status', 'PUBLISHED');
  if (publishedError) throw publishedError;

  const publishedProductIds = new Set((published || []).map((item) => item.product_id));
  const { data: pending, error: pendingError } = await supabase
    .from('marketing_content')
    .select('id, product_id, status, content_type, product:products(name)')
    .eq('channel', channel)
    .eq('content_type', 'REEL')
    .in('status', ['DRAFT', 'APPROVED'])
    .order('created_at', { ascending: true })
    .limit(MAX_PER_CHANNEL * 3);
  if (pendingError) throw pendingError;

  return (pending || []).filter((item) => !publishedProductIds.has(item.product_id)) as PendingContent[];
}

async function createMissingReel(channel: Channel): Promise<PendingContent | null> {
  const supabase = getSupabase();
  const { data: published, error: publishedError } = await supabase
    .from('marketing_content')
    .select('product_id')
    .eq('channel', channel)
    .eq('status', 'PUBLISHED');
  if (publishedError) throw publishedError;

  const publishedProductIds = new Set((published || []).map((item) => item.product_id));
  const { data: pendingContent, error: pendingError } = await supabase
    .from('marketing_content')
    .select('product_id')
    .eq('channel', channel)
    .eq('content_type', 'REEL')
    .in('status', ['DRAFT', 'APPROVED']);
  if (pendingError) throw pendingError;

  const pendingProductIds = new Set((pendingContent || []).map((item) => item.product_id));
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id')
    .eq('status', 'ACTIVE')
    .order('popularity_score', { ascending: false })
    .limit(100);
  if (productsError) throw productsError;

  const product = (products || []).find((item) => !publishedProductIds.has(item.id) && !pendingProductIds.has(item.id));
  if (!product) return null;

  const content = await generateContentDraftForProduct(product.id, channel, 'REEL');
  return content as PendingContent;
}

async function processChannel(channel: Channel) {
  const supabase = getSupabase();
  const stats = { channel, attempted: 0, generated: 0, published: 0, failed: 0, errors: [] as string[] };
  let pending = await getPendingContent(channel);

  while (pending.length < MAX_PER_CHANNEL) {
    const generated = await createMissingReel(channel);
    if (!generated) break;
    pending.push(generated);
    stats.generated += 1;
  }

  for (const content of pending.slice(0, MAX_PER_CHANNEL)) {
    stats.attempted += 1;
    try {
      if (content.status !== 'APPROVED') {
        const { error } = await supabase
          .from('marketing_content')
          .update({ status: 'APPROVED', publication_error: null, updated_at: new Date().toISOString() })
          .eq('id', content.id);
        if (error) throw error;
      }

      const video = await createFfmpegProductVideoAndUpload(content.id);
      console.log(`[FFmpeg] ${channel} vídeo pronto: ${video.videoUrl}`);

      const result = channel === 'instagram'
        ? await publishApprovedInstagramContent(content.id)
        : await publishApprovedFacebookReelContent(content.id);

      stats.published += 1;
      console.log(`[FFmpeg] ${channel} publicado: ${result.externalPostId}`);
      await wait(DELAY_MS);
    } catch (error) {
      stats.failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      stats.errors.push(`${content.id}: ${message}`);
      console.error(`[FFmpeg] Falha no ${channel}/${content.id}:`, message);
      await supabase.from('marketing_content').update({ publication_error: message, updated_at: new Date().toISOString() }).eq('id', content.id);
    }
  }

  return stats;
}

async function main() {
  console.log('=== GERAÇÃO E PUBLICAÇÃO DE REELS VIA FFMPEG ===');
  const results = [await processChannel('instagram'), await processChannel('facebook')];
  console.log(JSON.stringify(results, null, 2));
  if (results.some((result) => result.failed > 0 && result.published === 0)) process.exitCode = 1;
}

main().catch((error) => {
  console.error('Falha geral no job FFmpeg:', error);
  process.exitCode = 1;
});
