import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { buildAvatarScript, createHeyGenAvatarVideo } from '@/services/heygenAvatarVideo';

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

    const apiKey = process.env.HEYGEN_API_KEY;
    const avatarId = process.env.HEYGEN_AVATAR_ID;
    const voiceId = process.env.HEYGEN_VOICE_ID;
    const githubToken = process.env.GITHUB_ACTIONS_TOKEN;
    if (!apiKey || !avatarId || !voiceId || !githubToken) {
      return NextResponse.json({ error: 'Configure HEYGEN_API_KEY, HEYGEN_AVATAR_ID, HEYGEN_VOICE_ID e GITHUB_ACTIONS_TOKEN no Cloudflare Pages.' }, { status: 503 });
    }

    const { data: existingVideo, error: existingError } = await supabase
      .from('marketing_videos')
      .select('id,provider_render_id,status,video_url,error')
      .eq('content_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existingVideo?.provider_render_id?.startsWith('heygen:')) {
      if (existingVideo.status === 'RENDERING') {
        return NextResponse.json({ status: 'RENDERING', message: 'O avatar já está sendo gerado.' }, { status: 202 });
      }
      if (['SUCCEEDED', 'FINISHED', 'COMPLETED'].includes(String(existingVideo.status).toUpperCase()) && existingVideo.video_url) {
        return NextResponse.json({ status: 'SUCCEEDED', videoUrl: existingVideo.video_url }, { status: 200 });
      }
    }

    const product = content.product as { name?: string } | null;
    const script = buildAvatarScript({
      script: content.script,
      hook: content.hook,
      caption: content.caption,
      cta: content.cta,
      productName: product?.name || 'este produto',
    });
    const heygenVideoId = await createHeyGenAvatarVideo({ apiKey, avatarId, voiceId, script });
    const { error: insertError } = await supabase.from('marketing_videos').insert({
      id: crypto.randomUUID(),
      content_id: id,
      provider_render_id: `heygen:${heygenVideoId}`,
      status: 'RENDERING',
      video_url: null,
      error: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
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
      body: JSON.stringify({ ref: 'main', inputs: { content_id: id } }),
    });
    if (!dispatchResponse.ok) {
      const { error: updateError } = await supabase.from('marketing_videos').update({
        status: 'FAILED',
        error: `HeyGen iniciou o render, mas não foi possível iniciar o compositor FFmpeg (GitHub HTTP ${dispatchResponse.status}).`,
        updated_at: new Date().toISOString(),
      }).eq('provider_render_id', `heygen:${heygenVideoId}`);
      if (updateError) console.error('[HeyGen] Não foi possível atualizar o status após falha no dispatch:', updateError.message);
      return NextResponse.json({ error: 'O avatar foi solicitado, mas o compositor FFmpeg não iniciou. Verifique GITHUB_ACTIONS_TOKEN.' }, { status: 502 });
    }

    return NextResponse.json({
      status: 'RENDERING',
      message: 'Avatar enviado para geração. O FFmpeg finalizará o vídeo e o Reel ficará pronto para aprovação/publicação.',
    }, { status: 202 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao iniciar a geração do avatar.' }, { status: 502 });
  }
}