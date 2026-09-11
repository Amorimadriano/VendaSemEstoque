import { getSupabase } from '@/lib/supabase';
import { validateProductQuality } from '@/lib/productQuality';

export async function publishApprovedInstagramContent(contentId: string) {
  const token = process.env.META_ACCESS_TOKEN;
  const instagramAccountId = process.env.META_INSTAGRAM_ACCOUNT_ID;
  if (!token || !instagramAccountId) {
    throw new Error('META_ACCESS_TOKEN e META_INSTAGRAM_ACCOUNT_ID devem estar configurados.');
  }

  const supabase = getSupabase();
  const { data: content, error } = await supabase
    .from('marketing_content')
    .select('*, product:products(id,name,description,image_url,affiliate_url,price,status)')
    .eq('id', contentId)
    .eq('channel', 'instagram')
    .eq('status', 'APPROVED')
    .maybeSingle();

  if (error) throw error;
  if (!content) throw new Error('Conteúdo aprovado do Instagram não encontrado.');
  const { data: existingPublication, error: duplicateError } = await supabase
    .from('marketing_content')
    .select('id,external_post_id')
    .eq('product_id', content.product_id)
    .eq('channel', 'instagram')
    .eq('status', 'PUBLISHED')
    .neq('id', contentId)
    .limit(1)
    .maybeSingle();
  if (duplicateError) throw duplicateError;
  if (existingPublication) throw new Error('Este produto já possui uma publicação ativa no Instagram.');

  const product = content.product as { id?: string; name?: string; description?: string; image_url?: string; affiliate_url?: string; price?: number; status?: string } | null;
  const quality = validateProductQuality(product || {});
  if (!quality.valid) throw new Error(`Produto não atende aos critérios de publicação: ${quality.errors.join(', ')}.`);
  const caption = `${content.hook}\n\n${content.caption}\n\n${content.cta}\n🔗 Acesse o link na bio para ver a oferta e consultar a disponibilidade atualizada.`;
  const imageUrl = product?.image_url;

  if (content.content_type === 'REEL') {
    const { data: video, error: videoError } = await supabase
      .from('marketing_videos')
      .select('video_url,status')
      .eq('content_id', contentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (videoError) throw videoError;
    if (!video?.video_url || !['SUCCEEDED', 'FINISHED', 'COMPLETED'].includes(String(video.status).toUpperCase())) {
      throw new Error('Gere o vídeo do Reel e aguarde o render terminar antes de publicar.');
    }

    const createReelBody = new URLSearchParams({
      media_type: 'REELS',
      video_url: video.video_url,
      caption,
      share_to_feed: 'true',
      access_token: token,
    });
    const createReelResponse = await fetch(`https://graph.facebook.com/v26.0/${instagramAccountId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: createReelBody,
    });
    const reelContainer = await createReelResponse.json() as { id?: string; error?: { message?: string } };
    if (!createReelResponse.ok || !reelContainer.id) throw new Error(reelContainer.error?.message || `Meta API retornou ${createReelResponse.status} ao criar o Reel.`);

    let containerStatus = 'IN_PROGRESS';
    let containerError = '';
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const statusUrl = new URL(`https://graph.facebook.com/v26.0/${reelContainer.id}`);
      statusUrl.searchParams.set('fields', 'status_code,status');
      statusUrl.searchParams.set('access_token', token);
      const statusResponse = await fetch(statusUrl);
      const statusResult = await statusResponse.json() as { status_code?: string; status?: string; error?: { message?: string } };
      if (!statusResponse.ok) throw new Error(statusResult.error?.message || `Meta API retornou ${statusResponse.status} ao consultar o Reel.`);
      containerStatus = String(statusResult.status_code || statusResult.status || '').toUpperCase();
      if (containerStatus === 'FINISHED') break;
      if (containerStatus === 'ERROR' || containerStatus === 'EXPIRED') {
        containerError = statusResult.status || containerStatus;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    if (containerStatus !== 'FINISHED') throw new Error(`O Instagram não concluiu o processamento do Reel: ${containerError || containerStatus}.`);

    const publishReelBody = new URLSearchParams({ creation_id: reelContainer.id, access_token: token });
    const publishReelResponse = await fetch(`https://graph.facebook.com/v26.0/${instagramAccountId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: publishReelBody,
    });
    const publishedReel = await publishReelResponse.json() as { id?: string; error?: { message?: string } };
    if (!publishReelResponse.ok || !publishedReel.id) throw new Error(publishedReel.error?.message || `Meta API retornou ${publishReelResponse.status} ao publicar o Reel.`);

    const { error: reelUpdateError } = await supabase.from('marketing_content').update({ status: 'PUBLISHED', external_post_id: publishedReel.id, published_at: new Date().toISOString(), publication_error: null, attempt_count: 0, next_retry_at: null, processing_started_at: null, updated_at: new Date().toISOString() }).eq('id', contentId);
    if (reelUpdateError) throw reelUpdateError;
    return { published: true, externalPostId: publishedReel.id };
  }

  if (!imageUrl || !imageUrl.startsWith('http')) {
    throw new Error('O produto não possui uma imagem com URL pública válida para publicação no Instagram.');
  }

  // ETAPA 1: Criação do container de mídia no Instagram Graph API
  const createMediaBody = new URLSearchParams({
    image_url: imageUrl,
    caption,
    access_token: token,
  });

  const createMediaRes = await fetch(
    `https://graph.facebook.com/v26.0/${instagramAccountId}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: createMediaBody,
    }
  );

  const createResult = (await createMediaRes.json()) as { id?: string; error?: { message?: string } };
  if (!createMediaRes.ok || !createResult.id) {
    const errorMsg = createResult.error?.message || `Meta Graph API retornou ${createMediaRes.status} ao criar container.`;
    await supabase
      .from('marketing_content')
      .update({ publication_error: errorMsg, updated_at: new Date().toISOString() })
      .eq('id', contentId);
    throw new Error(errorMsg);
  }

  const containerId = createResult.id;

  // ETAPA 2: Publicação efetiva do container criado
  const publishBody = new URLSearchParams({
    creation_id: containerId,
    access_token: token,
  });

  const publishRes = await fetch(
    `https://graph.facebook.com/v26.0/${instagramAccountId}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: publishBody,
    }
  );

  const publishResult = (await publishRes.json()) as { id?: string; error?: { message?: string } };
  if (!publishRes.ok || !publishResult.id) {
    const errorMsg = publishResult.error?.message || `Meta Graph API retornou ${publishRes.status} ao publicar mídia.`;
    await supabase
      .from('marketing_content')
      .update({ publication_error: errorMsg, updated_at: new Date().toISOString() })
      .eq('id', contentId);
    throw new Error(errorMsg);
  }

  const { error: updateError } = await supabase
    .from('marketing_content')
    .update({
      status: 'PUBLISHED',
      external_post_id: publishResult.id,
      published_at: new Date().toISOString(),
      publication_error: null,
      attempt_count: 0,
      next_retry_at: null,
      processing_started_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', contentId);

  if (updateError) throw updateError;
  return { published: true, externalPostId: publishResult.id };
}
