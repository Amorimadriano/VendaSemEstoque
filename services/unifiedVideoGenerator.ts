import { getSupabase } from '@/lib/supabase';
import { createCreatomateVideo, refreshCreatomateVideo } from '@/services/creatomateVideo';
import { createFfmpegProductVideoAndUpload } from '@/services/ffmpegVideoGenerator';

export async function createProductVideo(contentId: string) {
  // 1. Tenta Creatomate se a API Key estiver configurada
  if (process.env.CREATOMATE_API_KEY) {
    try {
      return await createCreatomateVideo(contentId);
    } catch (err: any) {
      console.warn('[VideoGenerator] Creatomate falhou ou limite excedido. Ativando fallback para FFmpeg local:', err?.message || err);
    }
  }

  // 2. Fallback gratuito e ilimitado com FFmpeg + Supabase Storage
  const result = await createFfmpegProductVideoAndUpload(contentId);
  return {
    renderId: result.videoId,
    status: result.status,
    videoUrl: result.videoUrl,
  };
}

export async function refreshProductVideo(contentId: string) {
  const supabase = getSupabase();
  const { data: video } = await supabase
    .from('marketing_videos')
    .select('provider_render_id, status, video_url')
    .eq('content_id', contentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (video?.provider_render_id?.startsWith('ffmpeg_')) {
    return {
      status: video.status || 'SUCCEEDED',
      videoUrl: video.video_url,
    };
  }

  if (process.env.CREATOMATE_API_KEY && video?.provider_render_id) {
    return refreshCreatomateVideo(contentId);
  }

  return {
    status: video?.status || 'PENDING',
    videoUrl: video?.video_url || null,
  };
}
