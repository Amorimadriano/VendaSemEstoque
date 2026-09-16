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
      .select('status, video_url')
      .eq('content_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!video?.video_url) {
      return NextResponse.json(
        { status: 'PENDING', error: 'Vídeo ainda não foi gerado via FFmpeg para este conteúdo.' },
        { status: 404 }
      );
    }

    const ready = ['SUCCEEDED', 'FINISHED', 'COMPLETED'].includes(String(video.status || '').toUpperCase());
    return NextResponse.json(
      { status: video.status, videoUrl: video.video_url },
      { status: ready ? 200 : 409 }
    );
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao consultar status do vídeo.' }, { status: 500 });
  }
}