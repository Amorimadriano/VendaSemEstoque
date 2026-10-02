import { getSupabase } from '../lib/supabase';
import { getHeyGenAvatarVideoStatus } from '../services/heygenAvatarVideo';
import { renderAvatarProductVideoAndUpload } from '../services/ffmpegVideoGenerator';

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
const POLL_INTERVAL_MS = 15_000;
const MAX_POLLS = 40;

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function updateFailure(videoRecordId: string, message: string) {
  const { error } = await getSupabase().from('marketing_videos').update({
    status: 'FAILED',
    error: message.slice(0, 2000),
    updated_at: new Date().toISOString(),
  }).eq('id', videoRecordId);
  if (error) throw error;
}

async function processAvatarVideo(contentId: string) {
  if (!HEYGEN_API_KEY) throw new Error('HEYGEN_API_KEY não está configurada no GitHub Actions.');
  const supabase = getSupabase();
  const { data: video, error } = await supabase
    .from('marketing_videos')
    .select('id,provider_render_id,status')
    .eq('content_id', contentId)
    .like('provider_render_id', 'heygen:%')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!video) throw new Error('Render HeyGen não encontrado para este conteúdo.');

  const heygenVideoId = String(video.provider_render_id).slice('heygen:'.length);
  for (let attempt = 0; attempt < MAX_POLLS; attempt += 1) {
    let status;
    try {
      status = await getHeyGenAvatarVideoStatus({ apiKey: HEYGEN_API_KEY, videoId: heygenVideoId });
    } catch (error) {
      console.warn(`[HeyGen] Consulta temporariamente indisponível para ${contentId}:`, error instanceof Error ? error.message : String(error));
      await wait(POLL_INTERVAL_MS);
      continue;
    }

    if (status.status === 'FAILED') {
      await updateFailure(video.id, status.error || 'HeyGen falhou ao gerar o avatar.');
      throw new Error(status.error || 'HeyGen falhou ao gerar o avatar.');
    }

    if (status.status === 'COMPLETED' && status.videoUrl) {
      try {
        const result = await renderAvatarProductVideoAndUpload(contentId, video.id, status.videoUrl);
        console.log(`[HeyGen + FFmpeg] Reel pronto para ${contentId}: ${result.videoUrl}`);
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await updateFailure(video.id, message);
        throw error;
      }
    }

    console.log(`[HeyGen] Render ${heygenVideoId} ainda está em processamento (${attempt + 1}/${MAX_POLLS}).`);
    await wait(POLL_INTERVAL_MS);
  }

  const timeoutMessage = 'O avatar excedeu o tempo de processamento de 10 minutos.';
  await updateFailure(video.id, timeoutMessage);
  throw new Error(timeoutMessage);
}

async function main() {
  const contentId = process.argv[2];
  if (!contentId || !/^[0-9a-f-]{36}$/i.test(contentId)) {
    throw new Error('Informe um content_id UUID válido como argumento.');
  }

  console.log(`[HeyGen + FFmpeg] Processando conteúdo ${contentId}.`);
  await processAvatarVideo(contentId);
}

main().catch((error) => {
  console.error('[HeyGen + FFmpeg] Falha na geração:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});