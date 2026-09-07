import { getSupabase } from '@/lib/supabase';

type Render = { id?: string; status?: string; url?: string; error_message?: string };

export async function createCreatomateVideo(contentId: string) {
  const apiKey = process.env.CREATOMATE_API_KEY;
  const templateId = process.env.CREATOMATE_TEMPLATE_ID;
  if (!apiKey || !templateId) throw new Error('CREATOMATE_API_KEY e CREATOMATE_TEMPLATE_ID devem estar configurados como Secrets.');

  const supabase = getSupabase();
  const { data: content, error } = await supabase.from('marketing_content').select('*, product:products(image_url,key_benefits)').eq('id', contentId).eq('channel', 'facebook').eq('status', 'APPROVED').maybeSingle();
  if (error) throw error;
  if (!content) throw new Error('Aprove um rascunho do Facebook antes de gerar o vídeo.');
  const imageUrl = (content.product as { image_url?: string; key_benefits?: string } | null)?.image_url;
  if (!imageUrl) throw new Error('O produto precisa de uma imagem pública para gerar o vídeo.');

  const benefit = (content.product as { key_benefits?: string } | null)?.key_benefits || content.caption;
  const response = await fetch('https://api.creatomate.com/v2/renders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      template_id: templateId,
      modifications: {
        ProductImage: imageUrl,
        Hook: content.hook,
        Benefit: benefit,
        CTA: content.cta,
      },
    }),
  });
  const result = await response.json() as Render | Render[];
  const render = Array.isArray(result) ? result[0] : result;
  if (!response.ok || !render?.id) throw new Error(render?.error_message || `Creatomate retornou ${response.status}. Verifique os nomes ProductImage, Hook, Benefit e CTA no template.`);

  const { error: insertError } = await supabase.from('marketing_videos').insert({ id: crypto.randomUUID(), content_id: contentId, provider_render_id: render.id, status: render.status || 'RENDERING', video_url: render.url || null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  if (insertError) throw insertError;
  return { renderId: render.id, status: render.status || 'RENDERING', videoUrl: render.url || null };
}