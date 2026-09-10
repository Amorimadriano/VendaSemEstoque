import { getSupabase } from '@/lib/supabase';

type Render = { id?: string; status?: string; url?: string; error_message?: string };

function buildProductVideoSource(product: { name: string; image_url?: string; brand?: string | null; key_benefits?: string | null; marketplace?: { name?: string | null } | null }, content: { hook: string; caption: string; cta: string }) {
  const benefit = product.key_benefits || content.caption;
  const productName = product.name.length > 48 ? `${product.name.slice(0, 45)}...` : product.name;
  const hookText = content.hook.length > 58 ? `${content.hook.slice(0, 55)}...` : content.hook;
  const benefitText = benefit.length > 100 ? `${benefit.slice(0, 97)}...` : benefit;

  return {
    output_format: 'mp4',
    width: 1080,
    height: 1920,
    frame_rate: 30,
    duration: 10,
    elements: [
      { type: 'shape', path: 'M 0 0 L 100 0 L 100 100 L 0 100 Z', fill_color: '#f5f1e8', width: '100%', height: '100%' },
      { type: 'text', text: product.marketplace?.name || 'Oferta selecionada', x: '8%', y: '7%', width: '84%', height: '5%', font_family: 'Inter', font_weight: '700', font_size: '4vw', fill_color: '#1d3557', x_alignment: 0, y_alignment: 0.5 },
      { type: 'text', text: productName, x: '8%', y: '14%', width: '84%', height: '13%', font_family: 'Inter', font_weight: '800', font_size: '5vw', fill_color: '#111827', text_wrap: true, x_alignment: 0, y_alignment: 0 },
      { type: 'image', source: product.image_url, x: '10%', y: '31%', width: '80%', height: '39%', fit: 'contain' },
      { type: 'text', text: hookText, x: '8%', y: '73%', width: '84%', height: '7%', font_family: 'Inter', font_weight: '700', font_size: '4vw', fill_color: '#1d3557', text_wrap: true, x_alignment: 0, y_alignment: 0 },
      { type: 'text', text: benefitText, x: '8%', y: '82%', width: '84%', height: '7%', font_family: 'Inter', font_weight: '500', font_size: '3.2vw', fill_color: '#374151', text_wrap: true, x_alignment: 0, y_alignment: 0 },
      { type: 'text', text: content.cta, x: '8%', y: '93%', width: '84%', height: '4%', font_family: 'Inter', font_weight: '700', font_size: '3.2vw', fill_color: '#0f766e', x_alignment: 0, y_alignment: 0.5 },
    ],
  };
}

export async function createCreatomateVideo(contentId: string) {
  const apiKey = process.env.CREATOMATE_API_KEY;
  if (!apiKey) throw new Error('CREATOMATE_API_KEY deve estar configurado como Secret.');

  const supabase = getSupabase();
  const { data: content, error } = await supabase.from('marketing_content').select('*, product:products(name,brand,image_url,key_benefits,marketplace:marketplaces(name))').eq('id', contentId).in('channel', ['facebook', 'instagram']).eq('status', 'APPROVED').maybeSingle();
  if (error) throw error;
  if (!content) throw new Error('Aprove o conteúdo antes de gerar o vídeo.');
  const product = content.product as { name: string; image_url?: string; brand?: string | null; key_benefits?: string | null; marketplace?: { name?: string | null } | null } | null;
  const imageUrl = product?.image_url;
  if (!imageUrl) throw new Error('O produto precisa de uma imagem pública para gerar o vídeo.');

  const response = await fetch('https://api.creatomate.com/v2/renders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: buildProductVideoSource(product!, content) }),
  });
  const result = await response.json() as Render | Render[];
  const render = Array.isArray(result) ? result[0] : result;
  if (!response.ok || !render?.id) throw new Error(render?.error_message || `Creatomate retornou ${response.status} ao gerar a composição do produto.`);

  const { error: insertError } = await supabase.from('marketing_videos').insert({ id: crypto.randomUUID(), content_id: contentId, provider_render_id: render.id, status: render.status || 'RENDERING', video_url: render.url || null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  if (insertError) throw insertError;
  return { renderId: render.id, status: render.status || 'RENDERING', videoUrl: render.url || null };
}

export async function refreshCreatomateVideo(contentId: string) {
  const apiKey = process.env.CREATOMATE_API_KEY;
  if (!apiKey) throw new Error('CREATOMATE_API_KEY deve estar configurado como Secret.');

  const supabase = getSupabase();
  const { data: video, error } = await supabase.from('marketing_videos').select('provider_render_id').eq('content_id', contentId).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  if (!video?.provider_render_id) throw new Error('Nenhum vídeo foi gerado para este conteúdo.');

  const response = await fetch(`https://api.creatomate.com/v2/renders/${video.provider_render_id}`, { headers: { Authorization: `Bearer ${apiKey}` } });
  const render = await response.json() as Render;
  if (!response.ok) throw new Error(render.error_message || `Creatomate retornou ${response.status}.`);

  const { error: updateError } = await supabase.from('marketing_videos').update({ status: render.status || 'RENDERING', video_url: render.url || null, error: render.error_message || null, updated_at: new Date().toISOString() }).eq('provider_render_id', video.provider_render_id);
  if (updateError) throw updateError;
  return { status: render.status || 'RENDERING', videoUrl: render.url || null };
}