import { NextRequest, NextResponse } from 'next/server';
import { createCreatomateVideo } from '@/services/creatomateVideo';

export const runtime = 'edge';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    return NextResponse.json(await createCreatomateVideo(id), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao gerar vídeo.' }, { status: 500 });
  }
}