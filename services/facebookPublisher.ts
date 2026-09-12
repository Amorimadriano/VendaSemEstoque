import { getSupabase } from '@/lib/supabase';
import { validateProductQuality } from '@/lib/productQuality';

export async function publishApprovedFacebookContent(contentId: string) {
  const token = process.env.META_ACCESS_TOKEN;
  const pageId = process.env.META_FACEBOOK_PAGE_ID;
  if (!token || !pageId) throw new Error('META_ACCESS_TOKEN e META_FACEBOOK_PAGE_ID devem estar configurados como Secrets.');

  const supabase = getSupabase();
  const { data: content, error } = await supabase.from('marketing_content').select('*, product:products(id,name,description,image_url,affiliate_url,price,status)').eq('id', contentId).eq('channel', 'facebook').eq('status', 'APPROVED').maybeSingle();
  if (error) throw error;
  if (!content) throw new Error('Conteúdo aprovado do Facebook não encontrado.');
  const { data: existingPublication, error: duplicateError } = await supabase
    .from('marketing_content')
    .select('id,external_post_id')
    .eq('product_id', content.product_id)
    .eq('channel', 'facebook')
    .eq('status', 'PUBLISHED')
    .neq('id', contentId)
    .limit(1)
    .maybeSingle();
  if (duplicateError) throw duplicateError;
  if (existingPublication) throw new Error('Este produto já possui uma publicação ativa no Facebook.');
  if (content.content_type === 'REEL') {
    const { data: video } = await supabase
      .from('marketing_videos')
      .select('video_url,status')
      .eq('content_id', contentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (video?.video_url && ['SUCCEEDED', 'FINISHED', 'COMPLETED'].includes(String(video.status || '').toUpperCase())) {
      return publishApprovedFacebookReelContent(contentId);
    }
  }

  const product = content.product as { id?: string; name?: string; description?: string; image_url?: string; affiliate_url?: string; price?: number; status?: string } | null;
  const quality = validateProductQuality(product || {});
  if (!quality.valid) throw new Error(`Produto não atende aos critérios de publicação: ${quality.errors.join(', ')}.`);
  const siteUrl = (process.env.SITE_URL || 'https://venda-sem-estoque.pages.dev').replace(/\/$/, '');
  const partnerLink = product?.id ? `${siteUrl}/go/${product.id}?utm_source=facebook&utm_medium=organic` : siteUrl;
  const message = `${content.hook}\n\n${content.caption}\n\n${content.cta}\n${partnerLink}`;
  const imageUrl = product?.image_url;
  const endpoint = imageUrl ? 'photos' : 'feed';
  const body = new URLSearchParams({ message, access_token: token });
  if (imageUrl) body.set('url', imageUrl);
  const response = await fetch(`https://graph.facebook.com/v26.0/${pageId}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const result = await response.json() as { id?: string; error?: { message?: string } };
  if (!response.ok || !result.id) {
    const message = result.error?.message || `Meta API retornou ${response.status}.`;
    await supabase.from('marketing_content').update({ publication_error: message, updated_at: new Date().toISOString() }).eq('id', contentId);
    throw new Error(message);
  }

  const { error: updateError } = await supabase.from('marketing_content').update({ status: 'PUBLISHED', external_post_id: result.id, published_at: new Date().toISOString(), publication_error: null, attempt_count: 0, next_retry_at: null, processing_started_at: null, updated_at: new Date().toISOString() }).eq('id', contentId);
  if (updateError) throw updateError;
  return { published: true, externalPostId: result.id };
}

export async function publishApprovedFacebookReelContent(contentId: string) {
  const token = process.env.META_ACCESS_TOKEN;
  const pageId = process.env.META_FACEBOOK_PAGE_ID;
  if (!token || !pageId) throw new Error('META_ACCESS_TOKEN e META_FACEBOOK_PAGE_ID devem estar configurados como Secrets.');

  const supabase = getSupabase();
  const { data: content, error } = await supabase
    .from('marketing_content')
    .select('*, product:products(id,name,description,image_url,affiliate_url,price,status)')
    .eq('id', contentId)
    .eq('channel', 'facebook')
    .eq('content_type', 'REEL')
    .eq('status', 'APPROVED')
    .maybeSingle();
  if (error) throw error;
  if (!content) throw new Error('Reel aprovado do Facebook não encontrado.');

  const { data: video, error: videoError } = await supabase
    .from('marketing_videos')
    .select('video_url,status')
    .eq('content_id', contentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (videoError) throw videoError;
  if (!video?.video_url || !['SUCCEEDED', 'FINISHED', 'COMPLETED'].includes(String(video.status || '').toUpperCase())) throw new Error('Gere o vídeo e aguarde a renderização terminar antes de publicar o Reel.');

  const { data: existingPublication, error: duplicateError } = await supabase
    .from('marketing_content')
    .select('id')
    .eq('product_id', content.product_id)
    .eq('channel', 'facebook')
    .eq('status', 'PUBLISHED')
    .neq('id', contentId)
    .limit(1)
    .maybeSingle();
  if (duplicateError) throw duplicateError;
  if (existingPublication) throw new Error('Este produto já possui uma publicação ativa no Facebook.');

  const product = content.product as { id?: string; name?: string; description?: string; status?: string } | null;
  const quality = validateProductQuality(product || {});
  if (!quality.valid) throw new Error(`Produto não atende aos critérios de publicação: ${quality.errors.join(', ')}.`);
  const siteUrl = (process.env.SITE_URL || 'https://venda-sem-estoque.pages.dev').replace(/\/$/, '');
  const description = `${content.hook}\n\n${content.caption}\n\n${content.cta}\n${siteUrl}/go/${product?.id}?utm_source=facebook&utm_medium=organic`;
  const graphUrl = `https://graph.facebook.com/v26.0/${pageId}/video_reels`;

  const startResponse = await fetch(graphUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: new URLSearchParams({ upload_phase: 'start' }),
  });
  const startResult = await startResponse.json() as { video_id?: string; upload_url?: string; error?: { message?: string } };
  if (!startResponse.ok || !startResult.video_id || !startResult.upload_url) {
    throw new Error(startResult.error?.message || `Meta não iniciou o upload do Reel (${startResponse.status}).`);
  }

  // Baixar o vídeo binário para enviar via byte upload na URL de upload da Meta
  const videoFileRes = await fetch(video.video_url);
  if (!videoFileRes.ok) {
    throw new Error(`Não foi possível baixar o vídeo para envio (${videoFileRes.status}): ${video.video_url}`);
  }
  const videoBuffer = Buffer.from(await videoFileRes.arrayBuffer());

  const uploadResponse = await fetch(startResult.upload_url, {
    method: 'POST',
    headers: {
      Authorization: `OAuth ${token}`,
      offset: '0',
      file_size: videoBuffer.length.toString(),
      'Content-Type': 'application/octet-stream',
    },
    body: videoBuffer,
  });
  const uploadResult = await uploadResponse.json().catch(() => ({})) as { success?: boolean; error?: { message?: string } };
  if (!uploadResponse.ok || uploadResult.success === false) {
    throw new Error(uploadResult.error?.message || `Meta não recebeu o vídeo do Reel (${uploadResponse.status}).`);
  }

  const finishResponse = await fetch(graphUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: new URLSearchParams({ upload_phase: 'finish', video_id: startResult.video_id, video_state: 'PUBLISHED', description }),
  });
  const finishResult = await finishResponse.json() as { success?: boolean; post_id?: string; error?: { message?: string } };
  if (!finishResponse.ok || finishResult.success === false) {
    throw new Error(finishResult.error?.message || `Meta não publicou o Reel (${finishResponse.status}).`);
  }

  const { error: updateError } = await supabase.from('marketing_content').update({ status: 'PUBLISHED', external_post_id: finishResult.post_id || startResult.video_id, published_at: new Date().toISOString(), publication_error: null, attempt_count: 0, next_retry_at: null, processing_started_at: null, updated_at: new Date().toISOString() }).eq('id', contentId);
  if (updateError) throw updateError;
  return { published: true, externalPostId: finishResult.post_id || startResult.video_id };
}