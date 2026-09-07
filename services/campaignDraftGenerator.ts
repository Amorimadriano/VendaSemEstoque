import { getSupabase } from '@/lib/supabase';

type Product = { id: string; name: string; description: string; key_benefits?: string | null; marketplace?: { name?: string | null } | null; is_trending?: boolean; is_best_seller?: boolean; sales_count?: number; commission_percentage?: number };

function scoreProduct(product: Product) {
  return (product.is_trending ? 20 : 0) + (product.is_best_seller ? 15 : 0) + Math.min(Number(product.sales_count || 0) / 100, 20) + Math.min(Number(product.commission_percentage || 0), 15) + (product.description ? 15 : 0) + (product.key_benefits ? 15 : 0);
}

function campaign(product: Product) {
  const benefit = product.key_benefits || 'informações verificadas que ajudam na decisão de compra';
  return {
    product_id: product.id,
    channel: 'facebook',
    audience: `Pessoas interessadas em ${product.name} e em comparar informações antes de comprar.`,
    objective: 'Tráfego qualificado e conversão',
    angle: `Mostre como avaliar ${product.name} com clareza e informações verificáveis.`,
    hook: `O que vale conferir em ${product.name} antes de escolher?`,
    script: `Gancho: apresente uma dúvida comum sobre ${product.name}.\nBenefício: ${benefit}.\nExplicação: mostre dados verificados e oriente a conferir condições na página oficial.\nCTA: confira os detalhes na loja parceira.`,
    caption: `Pesquisando ${product.name}? Confira ${benefit}. Consulte preço, disponibilidade e condições atuais diretamente na ${product.marketplace?.name || 'loja parceira'} antes de comprar.`,
    cta: 'Confira os detalhes na loja parceira.',
    status: 'DRAFT',
  };
}

export async function generateCampaignDrafts() {
  const supabase = getSupabase();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase.from('products').select('id,name,description,key_benefits,is_trending,is_best_seller,sales_count,commission_percentage,marketplace:marketplaces(name)').eq('status', 'ACTIVE').limit(50);
  if (error) throw error;
  const candidates = ((data || []) as Product[]).filter((product) => scoreProduct(product) >= 45).sort((first, second) => scoreProduct(second) - scoreProduct(first)).slice(0, 2);
  let draftsCreated = 0;
  for (const product of candidates) {
    const { data: existing } = await supabase.from('marketing_campaigns').select('id').eq('product_id', product.id).gte('created_at', `${today}T00:00:00.000Z`).limit(1);
    if (existing?.length) continue;
    const { error: insertError } = await supabase.from('marketing_campaigns').insert({ id: crypto.randomUUID(), ...campaign(product), created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    if (insertError) throw insertError;
    draftsCreated += 1;
  }
  return { candidates: candidates.length, draftsCreated };
}