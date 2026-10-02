import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'edge';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabase();
    const { data: video, error } = await supabase
      .from('marketing_videos')
      .select('status, video_url, error, provider_render_id')
      .eq('content_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!video) {
      return NextResponse.json(
        { status: 'PENDING', error: 'Gere o vídeo com avatar antes de publicar.' },
        { status: 404 }
      );
    }

    if (String(video.status).toUpperCase() === 'FAILED') {
      return NextResponse.json({ status: 'FAILED', error: video.error || 'A geração do vídeo falhou.' }, { status: 422 });
    }

    const ready = ['SUCCEEDED', 'FINISHED', 'COMPLETED'].includes(String(video.status || '').toUpperCase());
    if (ready && video.video_url) return NextResponse.json({ status: video.status, videoUrl: video.video_url }, { status: 200 });

    const message = video.provider_render_id?.startsWith('dispatch:')
      ? String(video.status).toUpperCase() === 'QUEUED'
        ? 'O Reel está aguardando o runner do GitHub Actions.'
        : 'O runner do GitHub Actions iniciou o HeyGen; FFmpeg comporá o Reel em seguida.'
      : 'O avatar está sendo gerado; o FFmpeg ainda vai compor o Reel.';
    return NextResponse.json({ status: video.status || 'RENDERING', error: message }, { status: 409 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao consultar status do vídeo.' }, { status: 500 });
  }
}