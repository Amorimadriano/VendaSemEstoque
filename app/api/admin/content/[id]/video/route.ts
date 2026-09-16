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
    if (video?.video_url) {
      return NextResponse.json({
        status: video.status,
        videoUrl: video.video_url,
        message: 'Vídeo pronto no Supabase Storage.',
      }, { status: 200 });
    }

    return NextResponse.json({
      status: 'PENDING',
      message: 'Vídeos são gerados via FFmpeg e enviados para o Supabase Storage.',
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao processar vídeo.' }, { status: 500 });
  }
}