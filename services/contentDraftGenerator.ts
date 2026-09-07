import { getSupabase } from '@/lib/supabase';

type Product = {
  id: string;
  name: string;
  description: string;
  key_benefits?: string | null;
  marketplace?: { name?: string | null } | null;
  is_trending?: boolean;
  is_best_seller?: boolean;
  sales_count?: number;
  commission_percentage?: number;
};

function scoreProduct(product: Product) {
  return (product.is_trending ? 20 : 0) + (product.is_best_seller ? 15 : 0) + Math.min(Number(product.sales_count || 0) / 100, 20) + Math.min(Number(product.commission_percentage || 0), 15) + (product.description ? 15 : 0) + (product.key_benefits ? 15 : 0);
}

function createDraft(product: Product, channel: 'instagram' | 'facebook', contentType?: string) {
  const benefit = product.key_benefits || 'detalhes verificados para ajudar na decisão de compra';
  const hook = `O que conferir antes de escolher ${product.name}?`;
  return {
    product_id: product.id,
    channel,
    content_type: contentType || (channel === 'instagram' ? 'REEL' : 'POST'),
    hook,
    caption: `Pesquisando ${product.name}? Confira ${benefit}. Consulte condições, disponibilidade e informações atualizadas diretamente na ${product.marketplace?.name || 'loja parceira'} antes de comprar.`,
    script: `Gancho: ${hook}\nBenefício: ${benefit}.\nExplicação: apresente somente informações verificáveis na página oficial.\nCTA: confira os detalhes na loja parceira.`,
    cta: 'Confira os detalhes na loja parceira.',
    status: 'DRAFT',
  };
}

export async function generateContentDrafts() {
  const supabase = getSupabase();
  const today = new Date().toISOString().slice(0, 10);
  const { data: products, error } = await supabase.from('products').select('id,name,description,key_benefits,is_trending,is_best_seller,sales_count,commission_percentage,marketplace:marketplaces(name)').eq('status', 'ACTIVE').limit(50);
  if (error) throw error;

  const candidates = ((products || []) as Product[]).filter((product) => scoreProduct(product) >= 45).sort((first, second) => scoreProduct(second) - scoreProduct(first)).slice(0, 2);
  let created = 0;
  for (const product of candidates) {
    for (const channel of ['instagram', 'facebook'] as const) {
      const { data: existing } = await supabase.from('marketing_content').select('id').eq('product_id', product.id).eq('channel', channel).gte('created_at', `${today}T00:00:00.000Z`).limit(1);
      if (existing?.length) continue;
      const { error: insertError } = await supabase.from('marketing_content').insert({ id: crypto.randomUUID(), ...createDraft(product, channel), created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      if (insertError) throw insertError;
      created += 1;
    }
  }
  return { candidates: candidates.length, draftsCreated: created };
}

export async function generateContentDraftForProduct(productId: string, channel: 'instagram' | 'facebook', contentType: string) {
  const supabase = getSupabase();
  const { data: product, error } = await supabase.from('products').select('id,name,description,key_benefits,is_trending,is_best_seller,sales_count,commission_percentage,marketplace:marketplaces(name)').eq('id', productId).eq('status', 'ACTIVE').maybeSingle();
  if (error) throw error;
  if (!product) throw new Error('Produto ativo não encontrado.');

  const { data, error: insertError } = await supabase.from('marketing_content').insert({ id: crypto.randomUUID(), ...createDraft(product as Product, channel, contentType), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }).select('*, product:products(name)').single();
  if (insertError) throw insertError;
  return data;
}