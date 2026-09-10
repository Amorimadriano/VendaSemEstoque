import { NextRequest, NextResponse } from 'next/server';
import { refreshCreatomateVideo } from '@/services/creatomateVideo';

export const runtime = 'edge';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await refreshCreatomateVideo(id);
    const ready = ['SUCCEEDED', 'FINISHED', 'COMPLETED'].includes(result.status.toUpperCase()) && Boolean(result.videoUrl);
    return NextResponse.json(result, { status: ready ? 200 : 409 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao atualizar o vídeo.' }, { status: 500 });
  }
}