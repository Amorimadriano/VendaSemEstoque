import { getSupabase } from '@/lib/supabase';

export async function publishApprovedInstagramContent(contentId: string) {
  const token = process.env.META_ACCESS_TOKEN;
  const instagramAccountId = process.env.META_INSTAGRAM_ACCOUNT_ID;
  if (!token || !instagramAccountId) {
    throw new Error('META_ACCESS_TOKEN e META_INSTAGRAM_ACCOUNT_ID devem estar configurados.');
  }

  const supabase = getSupabase();
  const { data: content, error } = await supabase
    .from('marketing_content')
    .select('*, product:products(id,image_url)')
    .eq('id', contentId)
    .eq('channel', 'instagram')
    .eq('status', 'APPROVED')
    .maybeSingle();

  if (error) throw error;
  if (!content) throw new Error('Conteúdo aprovado do Instagram não encontrado.');

  const product = content.product as { id?: string; image_url?: string } | null;
  const siteUrl = (process.env.SITE_URL || 'https://venda-sem-estoque.pages.dev').replace(/\/$/, '');
  const partnerLink = product?.id ? `${siteUrl}/go/${product.id}?utm_source=instagram&utm_medium=bio` : siteUrl;
  const caption = `${content.hook}\n\n${content.caption}\n\n${content.cta}\n🔗 Link no perfil/site: ${partnerLink}`;
  const imageUrl = product?.image_url;

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
      updated_at: new Date().toISOString(),
    })
    .eq('id', contentId);

  if (updateError) throw updateError;
  return { published: true, externalPostId: publishResult.id };
}
