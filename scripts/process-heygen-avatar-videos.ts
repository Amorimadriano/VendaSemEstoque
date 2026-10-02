import { getSupabase } from '../lib/supabase';
import { createHeyGenAvatarProductVideoAndUpload } from '../services/ffmpegVideoGenerator';

async function processQueuedAvatarVideo(contentId: string, videoRecordId: string) {
  const supabase = getSupabase();
  const { error: startError } = await supabase.from('marketing_videos').update({
    status: 'RENDERING',
    updated_at: new Date().toISOString(),
  }).eq('id', videoRecordId).eq('content_id', contentId);
  if (startError) throw startError;

  try {
    const result = await createHeyGenAvatarProductVideoAndUpload(contentId);
    console.log(`[HeyGen + FFmpeg] Reel pronto para ${contentId}: ${result.videoUrl}`);
    const { error: removeQueueError } = await supabase.from('marketing_videos').delete().eq('id', videoRecordId);
    if (removeQueueError) console.warn('[HeyGen + FFmpeg] Vídeo pronto, mas o marcador da fila não foi removido:', removeQueueError.message);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const { error: updateError } = await supabase.from('marketing_videos').update({
      status: 'FAILED',
      error: message.slice(0, 2000),
      updated_at: new Date().toISOString(),
    }).eq('id', videoRecordId);
    if (updateError) console.error('[HeyGen + FFmpeg] Não foi possível registrar a falha:', updateError.message);
    throw error;
  }
}

async function main() {
  const contentId = process.argv[2];
  const videoRecordId = process.argv[3];
  if (!contentId || !/^[0-9a-f-]{36}$/i.test(contentId) || !videoRecordId || !/^[0-9a-f-]{36}$/i.test(videoRecordId)) {
    throw new Error('Informe content_id e video_record_id UUIDs válidos como argumentos.');
  }

  console.log(`[HeyGen + FFmpeg] Processando item enfileirado ${videoRecordId} para ${contentId}.`);
  await processQueuedAvatarVideo(contentId, videoRecordId);
}

main().catch((error) => {
  console.error('[HeyGen + FFmpeg] Falha na geração:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});