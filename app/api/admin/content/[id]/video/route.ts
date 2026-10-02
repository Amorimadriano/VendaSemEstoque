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
    const { data: content, error: contentError } = await supabase
      .from('marketing_content')
      .select('id,status,channel,content_type,script,hook,caption,cta,product:products(name)')
      .eq('id', id)
      .maybeSingle();

    if (contentError) throw contentError;
    if (!content) return NextResponse.json({ error: 'Conteúdo não encontrado.' }, { status: 404 });
    if (content.status !== 'APPROVED' || content.content_type !== 'REEL' || !['instagram', 'facebook'].includes(content.channel)) {
      return NextResponse.json({ error: 'Aprove um Reel do Instagram ou Facebook antes de gerar o avatar.' }, { status: 409 });
    }

    const githubToken = process.env.GITHUB_ACTIONS_TOKEN;
    if (!githubToken) {
      return NextResponse.json({ error: 'Configure GITHUB_ACTIONS_TOKEN no Cloudflare Pages para iniciar o worker de render.' }, { status: 503 });
    }

    const { data: existingVideo, error: existingError } = await supabase
      .from('marketing_videos')
      .select('id,provider_render_id,status,video_url,error')
      .eq('content_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existingVideo?.provider_render_id?.startsWith('dispatch:') && ['QUEUED', 'RENDERING'].includes(String(existingVideo.status).toUpperCase())) {
      return NextResponse.json({ status: existingVideo.status, message: 'O Reel já está na fila do worker de vídeo.' }, { status: 202 });
    }
    if (existingVideo?.provider_render_id?.startsWith('heygen:')) {
      if (existingVideo.status === 'RENDERING') {
        return NextResponse.json({ status: 'RENDERING', message: 'O avatar já está sendo gerado.' }, { status: 202 });
      }
      if (['SUCCEEDED', 'FINISHED', 'COMPLETED'].includes(String(existingVideo.status).toUpperCase()) && existingVideo.video_url) {
        return NextResponse.json({ status: 'SUCCEEDED', videoUrl: existingVideo.video_url }, { status: 200 });
      }
    }

    const dispatchRecordId = crypto.randomUUID();
    const now = new Date().toISOString();
    const { error: insertError } = await supabase.from('marketing_videos').insert({
      id: dispatchRecordId,
      content_id: id,
      provider_render_id: `dispatch:${dispatchRecordId}`,
      status: 'QUEUED',
      video_url: null,
      error: null,
      created_at: now,
      updated_at: now,
    });
    if (insertError) throw insertError;

    const repository = process.env.GITHUB_ACTIONS_REPOSITORY || 'Amorimadriano/VendaSemEstoque';
    const dispatchResponse = await fetch(`https://api.github.com/repos/${repository}/actions/workflows/process-heygen-avatar-videos.yml/dispatches`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({ ref: 'main', inputs: { content_id: id, video_record_id: dispatchRecordId } }),
    });
    if (!dispatchResponse.ok) {
      const { error: updateError } = await supabase.from('marketing_videos').update({
        status: 'FAILED',
        error: `O GitHub Actions não aceitou a fila (HTTP ${dispatchResponse.status}). Nenhum render HeyGen foi iniciado.`,
        updated_at: new Date().toISOString(),
      }).eq('id', dispatchRecordId);
      if (updateError) console.error('[HeyGen] Não foi possível atualizar o status após falha no dispatch:', updateError.message);
      return NextResponse.json({ error: `O GitHub Actions recusou a fila (HTTP ${dispatchResponse.status}). Verifique GITHUB_ACTIONS_TOKEN com permissão Actions: Read and write. Nenhum crédito HeyGen foi consumido.` }, { status: 502 });
    }

    return NextResponse.json({
      status: 'QUEUED',
      message: 'Reel enfileirado. O runner vai gerar o talking photo com HeyGen, compor com FFmpeg e salvar a prévia antes da publicação.',
    }, { status: 202 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao iniciar a geração do avatar.' }, { status: 502 });
  }
}