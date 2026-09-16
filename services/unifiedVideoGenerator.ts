import { getSupabase } from '@/lib/supabase';
import { createFfmpegProductVideoAndUpload } from '@/services/ffmpegVideoGenerator';

export async function createProductVideo(contentId: string) {
  // Geração 100% gratuita e ilimitada com FFmpeg + Supabase Storage
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

  return {
    status: video?.status || 'PENDING',
    videoUrl: video?.video_url || null,
  };
}
