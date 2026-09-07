import { getSupabase } from '@/lib/supabase';

export async function publishApprovedFacebookContent(contentId: string) {
  const token = process.env.META_ACCESS_TOKEN;
  const pageId = process.env.META_FACEBOOK_PAGE_ID;
  if (!token || !pageId) throw new Error('META_ACCESS_TOKEN e META_FACEBOOK_PAGE_ID devem estar configurados como Secrets.');

  const supabase = getSupabase();
  const { data: content, error } = await supabase.from('marketing_content').select('*').eq('id', contentId).eq('channel', 'facebook').eq('status', 'APPROVED').maybeSingle();
  if (error) throw error;
  if (!content) throw new Error('Conteúdo aprovado do Facebook não encontrado.');

  const message = `${content.hook}\n\n${content.caption}\n\n${content.cta}`;
  const response = await fetch(`https://graph.facebook.com/v26.0/${pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ message, access_token: token }),
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