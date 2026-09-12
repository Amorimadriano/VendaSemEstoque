import { getSupabase } from '@/lib/supabase';

export interface WeeklyCampaignDayPlan {
  dayOfWeek: string;
  focus: string;
  channel: 'instagram' | 'facebook';
  contentType: 'REEL' | 'POST' | 'STORY' | 'CAROUSEL';
  angle: string;
  hook: string;
  caption: string;
  script: string;
  cta: string;
  scheduledDayIndex: number;
}

export interface WeeklyProductCampaign {
  productId: string;
  productName: string;
  marketplaceName: string;
  price: number;
  commissionPercentage: number;
  calendar: WeeklyCampaignDayPlan[];
}

export interface WeeklyCampaignGenerationResult {
  productsAnalyzed: number;
  campaignsGenerated: number;
  daysScheduled: number;
  draftsCreated: number;
  details: Array<{
    productId: string;
    productName: string;
    daysCreated: number;
  }>;
}

type ProductRow = {
  id: string;
  name: string;
  brand?: string | null;
  description: string;
  price: number;
  cost?: number | null;
  key_benefits?: string | null;
  key_objections?: string | null;
  target_audience?: string | null;
  is_trending?: boolean;
  is_best_seller?: boolean;
  sales_count?: number;
  popularity_score?: number;
  commission_percentage?: number;
  marketplace?: { name?: string | null } | null;
};

const WEEK_DAYS = [
  { dayOfWeek: 'Segunda-feira', focus: 'Descoberta e Gancho de Curiosidade', channel: 'instagram' as const, contentType: 'REEL' as const, angle: 'Problema e Solução', scheduledDayIndex: 1 },
  { dayOfWeek: 'Terça-feira', focus: 'Educação e Critérios de Escolha', channel: 'instagram' as const, contentType: 'POST' as const, angle: 'Educativo / Análise', scheduledDayIndex: 2 },
  { dayOfWeek: 'Quarta-feira', focus: 'Superação de Dúvidas e Objeções', channel: 'instagram' as const, contentType: 'CAROUSEL' as const, angle: 'Dúvidas e FAQ', scheduledDayIndex: 3 },
  { dayOfWeek: 'Quinta-feira', focus: 'Demonstração de Recursos e Uso Prático', channel: 'instagram' as const, contentType: 'REEL' as const, angle: 'Demonstração', scheduledDayIndex: 4 },
  { dayOfWeek: 'Sexta-feira', focus: 'Conversão com Oferta e Condições Reais', channel: 'instagram' as const, contentType: 'REEL' as const, angle: 'Oferta / Conversão', scheduledDayIndex: 5 },
  { dayOfWeek: 'Sábado', focus: 'Comparativo de Custo-Benefício', channel: 'instagram' as const, contentType: 'POST' as const, angle: 'Comparativo Justo', scheduledDayIndex: 6 },
  { dayOfWeek: 'Domingo', focus: 'Recapitulação Semanal e CTA Final', channel: 'instagram' as const, contentType: 'STORY' as const, angle: 'Resumo / CTA Direto', scheduledDayIndex: 0 },
];

function scoreProductForCampaign(product: ProductRow): number {
  const trendingBonus = product.is_trending ? 25 : 0;
  const bestSellerBonus = product.is_best_seller ? 20 : 0;
  const salesBonus = Math.min((Number(product.sales_count) || 0) / 20, 25);
  const commissionBonus = Math.min((Number(product.commission_percentage) || 0) * 1.5, 20);
  const infoBonus = (product.key_benefits ? 10 : 0) + (product.description ? 10 : 0);
  return trendingBonus + bestSellerBonus + salesBonus + commissionBonus + infoBonus;
}

export function buildWeeklyCampaignPlan(product: ProductRow): WeeklyProductCampaign {
  const brandPrefix = product.brand ? `${product.brand} ` : '';
  const productName = product.name;
  const marketName = product.marketplace?.name || 'loja parceira';
  const benefit = product.key_benefits || 'detalhes verificados para ajudar na decisão informada';
  const audience = product.target_audience || `pessoas pesquisando ${productName} online`;
  const objections = product.key_objections || 'preço, compatibilidade, prazo e disponibilidade';

  const calendar: WeeklyCampaignDayPlan[] = WEEK_DAYS.map((day) => {
    let hook = '';
    let caption = '';
    let script = '';
    let cta = 'Confira os detalhes na loja parceira.';

    switch (day.scheduledDayIndex) {
      case 1: // Segunda - Descoberta
        hook = `O que você precisa conferir antes de escolher ${brandPrefix}${productName}?`;
        caption = `Pesquisando ${productName}? Separamos os pontos principais para avaliar antes de comprar. Veja os detalhes e condições diretamente na ${marketName}.`;
        script = `0-3s: Gancho direto com a pergunta principal.\n4-10s: Destaque de 2 benefícios centrais (${benefit}).\n11-15s: CTA para conferir na ${marketName}.`;
        cta = `Veja os detalhes de ${productName} na loja parceira.`;
        break;

      case 2: // Terça - Educação
        hook = `3 pontos fundamentais ao avaliar ${brandPrefix}${productName}:`;
        caption = `Para quem busca uma escolha segura: 1) Verifique especificações técnicas; 2) Consulte condições de entrega; 3) Compare o custo-benefício na ${marketName}.`;
        script = `Slide 1: O que observar em ${productName}.\nSlide 2: Benefício chave (${benefit}).\nSlide 3: Verifique as condições oficiais antes de fechar.`;
        cta = 'Consulte especificações e condições atuais.';
        break;

      case 3: // Quarta - Objeções
        hook = `Dúvidas frequentes sobre ${brandPrefix}${productName}: respondidas com dados oficiais.`;
        caption = `Antecipe as dúvidas: ${objections}. Consulte sempre os termos, prazos e garantia diretamente na página oficial da ${marketName}.`;
        script = `Dúvida comum 1: Como funciona o produto?\nResposta: com base nas especificações verificadas.\nDúvida comum 2: Como confirmar o preço?\nResposta: consulte a página oficial da ${marketName}.`;
        cta = 'Tire suas dúvidas e veja a oferta.';
        break;

      case 4: // Quinta - Demonstração
        hook = `Como ${brandPrefix}${productName} se aplica no dia a dia?`;
        caption = `Veja as características práticas de ${productName} e como ele atende às necessidades de ${audience}. Informações verificadas para a sua decisão.`;
        script = `Abertura: necessidade comum no dia a dia.\nDesenvolvimento: demonstração das funções de ${productName}.\nEncerramento: link oficial da ${marketName}.`;
        cta = 'Confira detalhes e disponibilidade agora.';
        break;

      case 5: // Sexta - Conversão
        hook = `Analisando a compra de ${brandPrefix}${productName}? Veja a oferta cadastrada.`;
        caption = `Oferta selecionada de ${productName}. Verifique valor, disponibilidade e condições de frete diretamente na ${marketName} antes de concluir.`;
        script = `0-3s: Destaque da oferta de ${productName}.\n4-10s: Resumo do benefício (${benefit}).\n11-15s: CTA transparente para conferir na ${marketName}.`;
        cta = `Confira o preço e condições na ${marketName}.`;
        break;

      case 6: // Sábado - Comparativo
        hook = `Vale a pena escolher ${brandPrefix}${productName}? Comparativo objetivo.`;
        caption = `Colocamos os diferenciais de ${productName} em perspectiva: recursos, durabilidade e custo-benefício. Confira a oferta na ${marketName}.`;
        script = `Comparação neutra baseada em especificações reais.\nDestaque dos prós informados pelo fabricante.\nLink oficial para checar a página do produto.`;
        cta = 'Compare as informações antes de decidir.';
        break;

      default: // Domingo - Recapitulação
        hook = `Resumo da semana: ${brandPrefix}${productName} em destaque.`;
        caption = `Perdeu os detalhes durante a semana? Acesse o link oficial para conhecer todas as especificações e condições de ${productName} na ${marketName}.`;
        script = `História rápida de 15s recapitulando os pontos altos de ${productName} e convidando para o link na bio.`;
        cta = 'Acesse o link na bio para ver a oferta.';
        break;
    }

    return {
      dayOfWeek: day.dayOfWeek,
      focus: day.focus,
      channel: day.channel,
      contentType: day.contentType,
      angle: day.angle,
      hook,
      caption,
      script,
      cta,
      scheduledDayIndex: day.scheduledDayIndex,
    };
  });

  return {
    productId: product.id,
    productName: product.name,
    marketplaceName: marketName,
    price: Number(product.price) || 0,
    commissionPercentage: Number(product.commission_percentage) || 0,
    calendar,
  };
}

export async function generateWeeklyCampaigns(limitProducts = 3): Promise<WeeklyCampaignGenerationResult> {
  const supabase = getSupabase();
  const today = new Date().toISOString().slice(0, 10);

  const { data: rawProducts, error } = await supabase
    .from('products')
    .select('id,name,brand,description,price,cost,key_benefits,key_objections,target_audience,is_trending,is_best_seller,sales_count,popularity_score,commission_percentage,marketplace:marketplaces(name)')
    .eq('status', 'ACTIVE')
    .limit(100);

  if (error) throw error;

  const products = (rawProducts || []) as ProductRow[];
  const ranked = [...products]
    .sort((a, b) => scoreProductForCampaign(b) - scoreProductForCampaign(a))
    .slice(0, limitProducts);

  let draftsCreated = 0;
  let campaignsGenerated = 0;
  let daysScheduled = 0;
  const details: Array<{ productId: string; productName: string; daysCreated: number }> = [];

  for (const product of ranked) {
    const weeklyPlan = buildWeeklyCampaignPlan(product);
    campaignsGenerated += 1;
    let daysCreatedForProduct = 0;

    // 1. Registra a campanha master na tabela marketing_campaigns
    const { data: existingCampaign } = await supabase
      .from('marketing_campaigns')
      .select('id')
      .eq('product_id', product.id)
      .gte('created_at', `${today}T00:00:00.000Z`)
      .limit(1);

    if (!existingCampaign?.length) {
      await supabase.from('marketing_campaigns').insert({
        id: crypto.randomUUID(),
        product_id: product.id,
        channel: 'multichannel',
        audience: product.target_audience || `Público interessado em ${product.name}`,
        objective: 'Tráfego qualificado e conversão semanal',
        angle: 'Grade de 7 dias (Descoberta a Conversão)',
        hook: `Cronograma Semanal completo para ${product.name}`,
        script: weeklyPlan.calendar.map((d) => `[${d.dayOfWeek}] ${d.contentType} (${d.channel}): ${d.hook}`).join('\n\n'),
        caption: `Campanha semanal automatizada com 7 peças planejadas para ${product.name}.`,
        cta: 'Acompanhe as publicações programadas.',
        status: 'DRAFT',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // 2. Cria os drafts específicos na tabela marketing_content para cada dia da semana
    for (const day of weeklyPlan.calendar) {
      const channel = day.channel === 'instagram' ? 'instagram' : 'facebook';
      const { data: existingDraft } = await supabase
        .from('marketing_content')
        .select('id')
        .eq('product_id', product.id)
        .eq('channel', channel)
        .eq('hook', day.hook)
        .limit(1);

      if (existingDraft?.length) continue;

      const { error: insertError } = await supabase.from('marketing_content').insert({
        id: crypto.randomUUID(),
        product_id: product.id,
        channel,
        content_type: day.contentType === 'CAROUSEL' || day.contentType === 'STORY' ? 'POST' : day.contentType,
        hook: day.hook,
        caption: day.caption,
        script: day.script,
        cta: day.cta,
        status: 'DRAFT',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (!insertError) {
        draftsCreated += 1;
        daysCreatedForProduct += 1;
        daysScheduled += 1;
      }
    }

    details.push({
      productId: product.id,
      productName: product.name,
      daysCreated: daysCreatedForProduct,
    });
  }

  return {
    productsAnalyzed: products.length,
    campaignsGenerated,
    daysScheduled,
    draftsCreated,
    details,
  };
}
