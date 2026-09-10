import { getSupabase } from '@/lib/supabase';

export async function publishApprovedFacebookContent(contentId: string) {
  const token = process.env.META_ACCESS_TOKEN;
  const pageId = process.env.META_FACEBOOK_PAGE_ID;
  if (!token || !pageId) throw new Error('META_ACCESS_TOKEN e META_FACEBOOK_PAGE_ID devem estar configurados como Secrets.');

  const supabase = getSupabase();
  const { data: content, error } = await supabase.from('marketing_content').select('*, product:products(id,image_url)').eq('id', contentId).eq('channel', 'facebook').eq('status', 'APPROVED').maybeSingle();
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
    throw new Error('Reels do Facebook exigem um vídeo processado. Este fluxo ainda não possui um vídeo publicado para este conteúdo.');
  }

  const product = content.product as { id?: string; image_url?: string } | null;
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

  const { error: updateError } = await supabase.from('marketing_content').update({ status: 'PUBLISHED', external_post_id: result.id, published_at: new Date().toISOString(), publication_error: null, updated_at: new Date().toISOString() }).eq('id', contentId);
  if (updateError) throw updateError;
  return { published: true, externalPostId: result.id };
}