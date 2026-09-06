'use client';

import { FormEvent, useEffect, useState } from 'react';
import { BarChart3, CalendarDays, CheckCircle2, ClipboardCheck, Copy, FileText, Megaphone, Sparkles, Target, TrendingUp } from 'lucide-react';

type Product = {
  id: string;
  name: string;
  brand?: string;
  description?: string;
  price: number;
  cost?: number;
  platform_fees?: number;
  shipping_cost?: number;
  marketing_cost?: number;
  other_costs?: number;
  oldPrice?: number;
  commissionPercentage: number;
  commissionValue: number;
  rating?: number;
  reviewCount?: number;
  computedScore?: number;
  salesCount?: number;
  isTrending?: boolean;
  isBestSeller?: boolean;
  competition_notes?: string;
  supplier_info?: string;
  key_benefits?: string;
  key_objections?: string;
  delivery_time?: string;
  return_policy?: string;
  target_audience?: string;
  affiliateUrl?: string;
  marketplace?: { name: string };
};

type Summary = {
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
  totalSaleValue: number;
  commissions: { total: number };
};

type AbTest = {
  id: string;
  product_id: string;
  variable: string;
  hypothesis: string;
  variation_a: string;
  variation_b: string;
  status: string;
  impressions: number;
  clicks: number;
  conversions: number;
};

function opportunity(product: Product) {
  const salePotential = Math.max(0.2, Math.min(Number(product.computedScore || 0) / 100 + (product.isTrending ? 0.15 : 0) + (product.isBestSeller ? 0.1 : 0), 1));
  const margin = Math.max(0.2, Math.min(product.commissionPercentage / 15, 1));
  const demand = Math.max(0.2, Math.min((product.salesCount || 0) / 1000, 1));
  const competition = product.competition_notes ? 0.8 : 0.5;
  const contentPotential = product.description && product.key_benefits ? 1 : product.description || product.key_benefits ? 0.65 : 0.3;
  const score = Math.round(salePotential * margin * demand * competition * contentPotential * 100);
  const reasons = [
    `potencial de venda: ${Math.round(salePotential * 100)}%`,
    `margem/comissão: ${Math.round(margin * 100)}%`,
    `demanda: ${Math.round(demand * 100)}% (${product.salesCount || 0} vendas registradas)`,
    `concorrência: ${product.competition_notes ? 'documentada' : 'a validar'}`,
    `potencial de conteúdo: ${Math.round(contentPotential * 100)}%`,
  ];
  if (score >= 80) return { score, label: 'PRODUTO PRIORITÁRIO', style: 'bg-red-50 text-red-700 border-red-200', reasons };
  if (score >= 60) return { score, label: 'TESTAR', style: 'bg-emerald-50 text-emerald-700 border-emerald-200', reasons };
  if (score >= 40) return { score, label: 'OBSERVAR', style: 'bg-amber-50 text-amber-700 border-amber-200', reasons };
  return { score, label: 'EVITAR', style: 'bg-gray-100 text-gray-600 border-gray-200', reasons };
}

function researchCriteria(product: Product) {
  return [
    ['Demanda', product.salesCount ? `${product.salesCount} vendas registradas` : 'Sem vendas registradas', Boolean(product.salesCount)],
    ['Tendência', product.isTrending ? 'Marcado como produto em alta' : 'Sem sinal de tendência cadastrado', Boolean(product.isTrending)],
    ['Preço', currency(product.price), true],
    ['Margem potencial', `${product.commissionPercentage}% de comissão cadastrada`, true],
    ['Benefício explicável', product.description ? 'Descrição disponível para análise' : 'Descrição do produto pendente', Boolean(product.description)],
    ['Potencial de conteúdo', product.description ? 'Validar com imagens e vídeos autorizados' : 'Requer descrição, imagens e vídeos', false],
    ['Concorrência', 'Pesquisar antes de anunciar', false],
    ['Potencial viral', 'Testar em conteúdo orgânico', false],
    ['Intenção de compra', 'Validar por buscas, CTR e conversões', false],
    ['Diferenciação', 'Comparar com ofertas concorrentes', false],
    ['Página do produto', 'Revisar oferta, disponibilidade e condições', false],
  ] as const;
}

function personaFor(product: Product) {
  const name = product.name.toLowerCase();
  const isTechnology = /(celular|smartphone|notebook|tv|fone|som|alexa|speaker)/.test(name);
  const isHome = /(casa|air fryer|cafeteira|cozinha|aspirador)/.test(name);

  return {
    buyer: isTechnology ? 'Pessoa pesquisando tecnologia e comparando recursos, preço e compatibilidade antes de comprar.' : isHome ? 'Pessoa buscando praticidade para a rotina e avaliando opções para casa.' : 'Pessoa pesquisando uma solução para uma necessidade específica e comparando ofertas.',
    age: 'Público adulto 18+. Validar faixas de maior conversão com dados agregados da plataforma.',
    interests: isTechnology ? 'Tecnologia, comparativos de produtos, novidades e compras online.' : isHome ? 'Casa, organização, praticidade e compras online.' : 'Conteúdo relacionado à categoria e compras online.',
    problems: 'Dificuldade em escolher entre opções e encontrar informações confiáveis antes da compra.',
    desires: 'Tomar uma decisão informada, com detalhes claros e condições verificáveis.',
    objections: 'Preço, disponibilidade, entrega, garantia, compatibilidade e confiança na oferta.',
    motivators: 'Demonstração objetiva, especificações verificadas, comparação clara e acesso à página oficial.',
    language: 'Direta, útil e transparente; sem promessas, urgência artificial ou alegações não comprovadas.',
    benefits: 'Informações claras, recursos relevantes para o uso e condições reais da loja parceira.',
  };
}

function funnelPlan(product: Product) {
  const price = currency(product.price);
  return [
    {
      stage: 'Topo do funil',
      goal: 'Chamar atenção e gerar descoberta',
      formats: 'Reel, vídeo curto, post educativo, curiosidade, problema e solução, demonstração, comparação ou entretenimento relacionado.',
      idea: `Comece por uma situação comum ligada a ${product.name} e mostre, em poucos segundos, como avaliar uma opção antes de comprar.`,
    },
    {
      stage: 'Meio do funil',
      goal: 'Gerar interesse e confiança',
      formats: 'Demonstração, benefícios, tutorial, perguntas frequentes, comparação e explicação de funcionamento.',
      idea: `Crie um carrossel respondendo às dúvidas mais importantes: recursos, compatibilidade, uso e o que conferir na página oficial de ${product.name}.`,
    },
    {
      stage: 'Fundo do funil',
      goal: 'Gerar vendas com informação verificável',
      formats: 'Oferta real, CTA, demonstração, benefícios, diferenciais, objeções e condições verdadeiras de compra.',
      idea: `Apresente ${product.name} por ${price} como valor cadastrado e convide a conferir disponibilidade, frete e condições na ${product.marketplace?.name || 'loja parceira'}.`,
    },
  ];
}

function socialPlan(product: Product) {
  const title = `Conheça ${product.name}`;
  const description = `Conteúdo informativo sobre ${product.name}, com detalhes para ajudar na decisão de compra.`;
  const structure = `Gancho: “O que verificar antes de escolher ${product.name}?”\nBenefício: informações para uma decisão mais consciente.\nExplicação: mostre apenas detalhes cadastrados e verificáveis.\nCTA: confira condições atuais na loja parceira.`;
  return {
    title,
    description,
    visual: 'Use imagens ou vídeos autorizados do produto em uso, com texto curto na tela e detalhes legíveis. Evite antes e depois, promessas ou comparações sem comprovação.',
    video: `Vídeo de 15 a 30 segundos: apresente ${product.name}, mostre um detalhe relevante, responda uma dúvida comum e direcione para a página oficial.`,
    hashtags: '#ofertas #comprasinteligentes #achadinhos #produtosonline',
    instagram: 'Priorize Reel vertical 9:16, gancho nos primeiros segundos e legenda curta com CTA para conferir os detalhes.',
    facebook: 'Use vídeo quadrado ou vertical e texto mais explicativo; adicione o link oficial e informações verificáveis na descrição.',
    variations: [
      `Gancho: “O que verificar antes de escolher ${product.name}?” | CTA: “Confira os detalhes.”`,
      `Gancho: “Veja este recurso de ${product.name} antes de comprar.” | CTA: “Compare na loja parceira.”`,
      `Gancho: “Uma forma prática de conhecer ${product.name}.” | CTA: “Veja condições e disponibilidade.”`,
    ],
    contentTypes: [
      ['Reel', 'Descoberta', `Apresente uma dúvida comum sobre ${product.name}.`],
      ['Stories', 'Relacionamento', 'Use enquete de preferência e responda com informação verificável.'],
      ['Post', 'Educação', 'Explique um critério útil para avaliar o produto.'],
      ['Carrossel', 'Educação', 'Organize dúvidas, recursos e o que conferir antes da compra.'],
      ['Vídeo curto', 'Demonstração', 'Mostre o produto ou material autorizado em contexto de uso.'],
      ['Comparação', 'Consideração', 'Compare apenas especificações confirmadas, sem alegar superioridade.'],
      ['Demonstração', 'Consideração', 'Mostre detalhes verificáveis e responda uma objeção frequente.'],
      ['Conteúdo educativo', 'Educação', 'Ensine como analisar condições, frete e compatibilidade.'],
      ['Conteúdo de entretenimento', 'Descoberta', 'Use uma situação cotidiana relacionada à categoria sem promessa de resultado.'],
      ['Conteúdo de prova', 'Confiança', 'Use somente avaliações, dados ou materiais previamente autorizados.'],
      ['Conteúdo de conversão', 'Conversão', `Apresente a oferta cadastrada e convide a conferir detalhes de ${product.name}.`],
    ],
    structure,
  };
}

function contentAngles(product: Product, persona: ReturnType<typeof personaFor>) {
  const benefits = product.key_benefits || persona.benefits;
  const objections = product.key_objections || persona.objections;
  return [
    ['1. Problema', persona.problems],
    ['2. Benefício', benefits],
    ['3. Demonstração', `Mostre como ${product.name} funciona ou apresente recursos confirmados no material autorizado.`],
    ['4. Comparação', product.competition_notes ? `Compare de forma justa usando: ${product.competition_notes}` : 'Só compare alternativas após registrar especificações e condições verificáveis de cada opção.'],
    ['5. Curiosidade', `“O que vale conferir em ${product.name} antes de decidir?” Apresente um detalhe verificado e convide a ver o restante.`],
    ['6. Oferta', `Apresente o preço cadastrado de ${currency(product.price)} e indique que disponibilidade, frete e condições devem ser confirmados na ${product.marketplace?.name || 'loja parceira'}.`],
    ['7. Objeção', `Responda com transparência: ${objections}`],
  ] as const;
}

function videoKit(product: Product) {
  return {
    hooks: [
      `O que vale conferir em ${product.name} antes de escolher?`,
      `Um detalhe de ${product.name} que pode ajudar na sua decisão.`,
      `Antes de comparar opções, veja estes pontos sobre ${product.name}.`,
      `Está pesquisando ${product.name}? Comece por aqui.`,
      `Veja como analisar ${product.name} com mais segurança.`,
    ],
    scripts: [
      `0-3s: faça a pergunta principal sobre ${product.name}.\n4-12s: mostre um detalhe verificável ou material autorizado.\n13-20s: explique o que conferir na oferta.\nFinal: convide a consultar a página oficial.`,
      `0-3s: apresente uma dúvida comum.\n4-12s: explique como o produto atende à necessidade com informações verificadas.\n13-20s: responda uma objeção.\nFinal: CTA para ver detalhes.`,
      `0-3s: mostre o produto em contexto de uso autorizado.\n4-12s: destaque benefícios cadastrados.\n13-20s: oriente a confirmar condições.\nFinal: CTA para a loja parceira.`,
    ],
    ctas: ['Confira detalhes e condições na loja parceira.', 'Veja especificações e disponibilidade atual.', 'Compare as informações antes de decidir.'],
    captions: [
      `Pesquisando ${product.name}? Reunimos detalhes para você avaliar com calma. Confira as condições atuais na loja parceira.`,
      `Antes de comprar, compare especificações, disponibilidade e condições de ${product.name}. Veja a oferta oficial.`,
      `Uma decisão informada começa pelos detalhes. Conheça ${product.name} e consulte a página oficial.`,
    ],
    thumbnails: [
      `Produto em destaque + texto: “O que conferir?”`,
      `Detalhe visual autorizado + texto: “Antes de escolher”`,
      `Produto em contexto + texto: “Guia rápido”`,
    ],
    videos: [
      'Dúvida comum e resposta com dados verificáveis.',
      'Três pontos para conferir antes da compra.',
      'Demonstração com material autorizado.',
      'Comparação justa de especificações cadastradas.',
      'Checklist de condições a consultar na oferta oficial.',
    ],
  };
}

function distributionPlan(product: Product) {
  return [
    ['Instagram', 'Reels e Stories', `Use os roteiros e variações de ${product.name}; adapte para formato vertical e CTA para a página oficial.`],
    ['Facebook', 'Reels, posts e grupos quando apropriado', 'Publique conteúdo útil e relevante para cada contexto; não faça mensagens repetitivas ou divulgação não autorizada em grupos.'],
    ['Shopee', 'Conteúdo e recursos permitidos', 'Use apenas recursos oficiais da plataforma e dados verificados da oferta.'],
    ['Mercado Livre', 'Recursos permitidos pela plataforma', 'Priorize apresentação clara, descrição estruturada e respostas verificáveis.'],
    ['Hotmart', 'Conteúdo de afiliado autorizado', 'Use materiais permitidos pelo produtor e siga as regras da oferta e da Hotmart.'],
    ['Site próprio', 'Página do produto, conteúdo e CTA', 'Direcione para a página da oferta com dados, condições e CTA claros.'],
  ] as const;
}

function funnelLossPoints(summary: Summary) {
  return [
    ['1. Conteúdo', 'Alcance, retenção inicial, clareza do gancho e aderência ao canal.', 'Requer dados de publicações, alcance e visualizações por plataforma.'],
    ['2. Interesse', 'Engajamento qualificado, respostas, salvamentos e avanço para o link.', 'Requer métricas oficiais de engajamento por peça.'],
    ['3. Cliques', `Cliques registrados: ${summary.totalClicks}. Avalie CTA, link e formato.`, 'CTR exige impressões por campanha ou publicação.'],
    ['4. Página do produto', 'Velocidade, clareza de preço, descrição, imagens, confiança e condições.', 'Requer analytics de página, eventos de visualização e abandono.'],
    ['5. Compra', `Conversões registradas: ${summary.totalConversions}; taxa atual: ${summary.conversionRate}%.`, 'Requer eventos de compra e atribuição por produto/canal.'],
    ['6. Pós-venda', 'Entrega, suporte, satisfação, devoluções e dúvidas recorrentes.', 'Requer integração da loja parceira ou feedback autorizado.'],
    ['7. Recompra e indicação', 'Retenção, recompra, avaliações autorizadas e indicação.', 'Requer identificação consentida do cliente e dados de retenção.'],
  ] as const;
}

function productTestDecision(product: Product, summary: Summary) {
  const score = opportunity(product).score;
  const hasVolume = summary.totalClicks >= 100 && summary.totalConversions >= 5;
  if (!hasVolume) return { label: 'CONTINUAR TESTANDO', style: 'bg-blue-50 text-blue-700 border-blue-200', reason: 'Ainda não há volume suficiente de cliques e conversões atribuídos por produto para comparar resultados e escalar.' };
  if (score >= 80 && product.salesCount && product.salesCount > 0) return { label: 'VENCEDOR', style: 'bg-amber-50 text-amber-800 border-amber-200', reason: 'A pontuação comercial é alta e há vendas registradas. Revise resultados por canal e por variação antes de aprovar escala.' };
  if (score >= 60) return { label: 'CONTINUAR TESTANDO', style: 'bg-blue-50 text-blue-700 border-blue-200', reason: 'O produto mostra potencial, mas requer mais testes controlados para identificar o melhor formato, público e CTA.' };
  if (score >= 40) return { label: 'PAUSAR', style: 'bg-gray-100 text-gray-700 border-gray-200', reason: 'O potencial atual é moderado. Pause novos esforços até melhorar oferta, dados ou criativos.' };
  return { label: 'DESCARTAR', style: 'bg-red-50 text-red-700 border-red-200', reason: 'O produto não possui sinais suficientes de potencial no momento. Não invista em escala.' };
}

function learningActions(summary: Summary, product?: Product) {
  const actions: string[] = [];
  if (summary.totalClicks >= 100 && summary.conversionRate < 1) actions.push('Há muitos cliques com baixa conversão: analise preço, página do produto, confiança e condições da oferta.');
  if (product?.cost !== undefined && product.cost !== null && product.price - product.cost - product.commissionValue - (product.platform_fees || 0) - (product.shipping_cost || 0) - (product.marketing_cost || 0) - (product.other_costs || 0) <= 0) actions.push('Há venda potencial sem lucro estimado por unidade: revise margem, comissão e custos antes de escalar.');
  if (product?.salesCount && product.salesCount >= 100) actions.push('O produto tem vendas registradas de forma consistente: teste novos conteúdos e ângulos com uma variável por vez.');
  if (!actions.length) actions.push('Ainda não há sinais suficientes para concluir um padrão. Continue medindo cliques, conversões, custos e resultados por produto e canal.');
  return actions;
}

function orchestratorAction(product: Product | undefined, summary: Summary) {
  if (!product) return 'Cadastre ou importe produtos para iniciar a pesquisa e a priorização.';
  if (opportunity(product).score < 60) return `Complete os dados de ${product.name} antes de criar novos conteúdos ou investir em divulgação.`;
  if (summary.totalClicks < 100) return `Prepare um teste A/B para ${product.name} e publique somente após aprovação, priorizando a coleta de cliques.`;
  if (summary.conversionRate < 1) return `Revise a página, CTA e condições de ${product.name}; há tráfego para analisar antes de escalar.`;
  return `Compare os resultados de ${product.name} por canal e criativo, registre aprendizados e prepare o próximo teste.`;
}

function hotmartPlan(product: Product) {
  const isHotmartProduct = product.marketplace?.name?.toLowerCase().includes('hotmart');
  return {
    isHotmartProduct,
    status: isHotmartProduct ? 'Oferta Hotmart identificada: confirme os dados abaixo antes de divulgar.' : 'Nenhuma oferta Hotmart identificada para este produto. Não preparar publicação até existir uma oferta autorizada.',
    checks: [
      ['Oferta e posicionamento', isHotmartProduct ? 'Confirmar promessa, público e página de vendas oficiais.' : 'Produto ou link Hotmart não cadastrado.'],
      ['Comissão', isHotmartProduct ? `${product.commissionPercentage}% cadastrado; confirmar no programa da oferta.` : 'Comissão Hotmart não informada.'],
      ['Público', 'Validar com informações autorizadas do produtor e dados agregados.'],
      ['Materiais', 'Usar somente imagens, vídeos e textos autorizados pelo produtor.'],
      ['Regras de divulgação', 'Verificar termos do programa de afiliados e políticas de anúncios antes de veicular.'],
      ['Restrições', 'Não fazer promessas, alegações não comprovadas, spam ou publicidade proibida.'],
    ],
    potential: isHotmartProduct ? `Avalie comissão cadastrada (${product.commissionPercentage}%), oferta oficial, público e materiais autorizados antes de priorizar a divulgação.` : 'Nenhum produto ou oferta Hotmart registrado para analisar potencial.',
    discovery: `Post de descoberta: apresente o problema que ${product.name} se propõe a resolver e convide o público a conhecer o conteúdo oficial, sem prometer resultados.`,
    educational: `Conteúdo educativo: explique um conceito relacionado à oferta e oriente a pessoa a consultar programa, conteúdo, condições e página oficial de ${product.name}.`,
    conversion: `Conteúdo de conversão: apresente a proposta oficial de ${product.name}, esclareça uma objeção com dados autorizados e use CTA para conferir os detalhes na página de vendas.`,
    reel: `Reel de 20 segundos: 1) pergunte sobre a necessidade do público; 2) apresente o tema da oferta; 3) mostre um material autorizado; 4) convide a conhecer os detalhes oficiais.`,
    post: `Post: “O que considerar antes de escolher ${product.name}?” Estruture em problema, informações verificáveis, para quem pode ser relevante e link para a página oficial.`,
    ctas: 'Conheça os detalhes oficiais. | Veja para quem a oferta é indicada. | Consulte condições e materiais autorizados.',
    strategy: 'Use conteúdo educativo e de descoberta para qualificar interesse; direcione à página oficial com transparência sobre o vínculo de afiliado. Não prometa renda, cura, qualificação profissional ou resultados individuais.',
  };
}

function ethicalCopy(product: Product, persona: ReturnType<typeof personaFor>) {
  const proof = product.salesCount
    ? `${product.salesCount} vendas estão registradas no sistema. Confirme a origem e autorização desse dado antes de publicá-lo.`
    : 'Nenhuma prova autorizada disponível. Não use avaliações, depoimentos, resultados ou números não comprovados.';

  return [
    ['Gancho', `Você também quer avaliar ${product.name} antes de tomar uma decisão de compra?`],
    ['Problema', persona.problems],
    ['Interesse', `Conheça os detalhes cadastrados de ${product.name} e o que verificar na página oficial.`],
    ['Benefício', persona.benefits],
    ['Prova', proof],
    ['Tratamento de objeção', `Antes de comprar, confira preço, disponibilidade, frete, garantia e compatibilidade diretamente na ${product.marketplace?.name || 'loja parceira'}.`],
    ['CTA', 'Confira todos os detalhes e condições atuais na loja parceira.'],
  ] as const;
}

function shopeePlan(product: Product) {
  const isShopee = product.marketplace?.name?.toLowerCase().includes('shopee');
  const keywords = [product.brand, ...product.name.split(/\s+/).filter((word) => word.length > 3)].filter(Boolean).slice(0, 8).join(', ');
  return {
    isShopee,
    title: `${product.brand ? `${product.brand} ` : ''}${product.name}`.slice(0, 120),
    description: product.description || 'Descrição não cadastrada. Complete com informações verificadas antes de anunciar.',
    benefits: product.key_benefits || 'Benefícios não cadastrados. Não criar alegações sem confirmação.',
    keywords: keywords || 'Palavras-chave dependem de título e descrição cadastrados.',
    image: 'Use imagens autorizadas que mostrem o produto, detalhes relevantes e contexto de uso. Não adicione textos ou características não verificadas.',
    video: `Vídeo curto: apresente ${product.name}, mostre um detalhe cadastrado, explique como consultar as condições e direcione para a página oficial.`,
    price: product.oldPrice && product.oldPrice > product.price ? `Preço cadastrado: ${currency(product.price)}. Desconto calculado com base no preço anterior cadastrado; confirme a oferta antes de publicar.` : `Preço cadastrado: ${currency(product.price)}. Sem promoção sugerida enquanto não houver uma oferta real registrada.`,
    competition: product.competition_notes || 'Dados de concorrência não disponíveis. Pesquise fontes permitidas antes de concluir uma análise.',
  };
}

function mercadoLivrePlan(product: Product) {
  const isMercadoLivre = product.marketplace?.name?.toLowerCase().includes('mercado livre');
  const keywords = [product.brand, ...product.name.split(/\s+/).filter((word) => word.length > 3)].filter(Boolean).slice(0, 8).join(', ');
  return {
    isMercadoLivre,
    title: `${product.brand ? `${product.brand} ` : ''}${product.name}`.slice(0, 120),
    description: product.description ? `O que é: ${product.description}\n\nAntes de comprar: confirme especificações, compatibilidade, disponibilidade, frete e condições na página oficial.` : 'Descrição não cadastrada. Estruture o que é o produto, seus detalhes verificáveis e as condições que devem ser conferidas na oferta.',
    differentials: product.key_benefits || 'Diferenciais não cadastrados. Use somente características verificadas na página do produto.',
    keywords: keywords || 'Palavras-chave dependem de título e descrição cadastrados.',
    objections: product.key_objections || 'Antecipe dúvidas sobre preço, frete, garantia, disponibilidade e compatibilidade; confirme cada resposta na oferta oficial.',
    questions: `P: O que devo verificar antes de comprar ${product.name}?\nR: Especificações, compatibilidade, preço, frete, prazo, garantia e disponibilidade na página oficial.\n\nP: O preço está atualizado?\nR: O valor exibido pode variar; confirme as condições atuais no Mercado Livre antes de finalizar.`,
    presentation: 'Use imagens autorizadas e nítidas, título direto, descrição organizada e condições transparentes. Evite alegações, avaliações ou resultados sem confirmação.',
    social: `Crie um vídeo curto mostrando como avaliar ${product.name}: mostre detalhes verificáveis, responda uma dúvida comum e direcione para a oferta oficial.`,
    metrics: `Cliques registrados: ${product.salesCount || 0} vendas registradas no catálogo. CTR, visualizações, perguntas, conversão e receita por anúncio dependem da integração oficial do Mercado Livre.`,
  };
}

function aliExpressPlan(product: Product) {
  const isAliExpress = product.marketplace?.name?.toLowerCase().includes('aliexpress');
  const checks = [
    ['Preço', currency(product.price), true],
    ['Prazo de entrega', product.delivery_time || 'Não informado', Boolean(product.delivery_time)],
    ['Fornecedor', product.supplier_info || 'Não informado', Boolean(product.supplier_info)],
    ['Avaliações', product.rating ? `${product.rating}/5 com ${product.reviewCount || 0} avaliações` : 'Não informado', Boolean(product.rating)],
    ['Qualidade', product.key_benefits || 'Sem informações verificadas de qualidade', Boolean(product.key_benefits)],
    ['Política de devolução', product.return_policy || 'Não informada', Boolean(product.return_policy)],
    ['Disponibilidade', 'Confirmar na página oficial antes de recomendar', false],
    ['Margem potencial', `${product.commissionPercentage}% de comissão cadastrada`, true],
  ] as const;
  const eligible = checks.every(([, , verified]) => verified);
  return {
    isAliExpress,
    checks,
    eligible,
    status: eligible ? 'Candidato para revisão: todos os critérios essenciais foram cadastrados. Confirme os dados atuais na oferta antes de divulgar.' : 'Não recomendado por enquanto: complete os critérios pendentes. Preço baixo isoladamente não é motivo suficiente para divulgar.',
    research: `Pesquise tendências, fornecedores e comparativos de ${product.name}. Use o resultado para ideias de conteúdo e para validar a estratégia de venda sem estoque quando permitida.`,
    content: `Ideia de conteúdo: mostre quais critérios devem ser verificados antes de escolher ${product.name}, sem alegar qualidade, prazo ou condições que não estejam confirmados.`,
  };
}

function performanceReview(summary: Summary, product?: Product) {
  const hasConversionData = summary.totalConversions > 0;
  const ticket = hasConversionData ? currency(summary.totalSaleValue / summary.totalConversions) : 'Sem dados suficientes';
  const unitProfit = product?.cost !== undefined && product.cost !== null
    ? currency(product.price - product.cost - product.commissionValue - (product.platform_fees || 0) - (product.shipping_cost || 0) - (product.marketing_cost || 0) - (product.other_costs || 0))
    : 'Requer custo do produto e comissão atribuída';
  const learning = hasConversionData
    ? 'Há conversões registradas. Compare produtos, canais e variações antes de escalar uma campanha.'
    : 'Ainda não há conversões registradas em volume suficiente para concluir o que funciona.';
  return {
    ticket,
    unitProfit,
    learning,
    worked: hasConversionData ? `Conversões registradas: ${summary.totalConversions}.` : 'Não há volume suficiente para afirmar que uma campanha funcionou.',
    failed: 'Não é possível identificar falhas de campanha sem dados por canal, publicação ou variação.',
    why: 'Integrações de Facebook, Instagram, Hotmart e investimento em mídia ainda não enviam métricas para este painel.',
    keep: hasConversionData ? 'Manter a medição de cliques e conversões dos produtos com melhor resultado.' : 'Manter a coleta de cliques, conversões e dados por campanha.',
    change: 'Conectar dados oficiais de publicação, alcance, visualizações, engajamento, custos de produto e despesas de marketing.',
    next: product ? `Testar um único gancho para ${product.name} e comparar CTR e conversões.` : 'Cadastre produtos e registre um teste A/B para iniciar a análise.',
  };
}

function currency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function campaignFor(product: Product) {
  const brand = product.brand ? `${product.brand} ` : '';
  const displayPrice = currency(product.price);
  const discount = product.oldPrice && product.oldPrice > product.price ? `De ${currency(product.oldPrice)} por ${displayPrice}.` : `Confira o valor atual de ${displayPrice} na loja parceira.`;

  return {
    audience: `Pessoas interessadas em ${product.name}, comparando opções e buscando uma compra informada. Validar interesses e público com dados da plataforma antes de veicular anúncios.`,
    angle: `Apresente o benefício principal de ${brand}${product.name} com uma demonstração objetiva e direcione para a página oficial.`,
    hook: `Antes de decidir sua próxima compra, veja estes detalhes de ${product.name}.`,
    script: `Cena 1: mostre o produto e a necessidade que ele resolve.\nCena 2: destaque recursos verificáveis na página oficial.\nCena 3: mostre o produto em uso ou detalhe visual relevante.\nCena 4: ${discount}\nCena 5: convide a pessoa a conferir especificações e disponibilidade no site.`,
    caption: `Procurando ${product.name}? Selecionamos esta opção da ${product.marketplace?.name || 'loja parceira'} para você analisar. ${discount} Consulte características, disponibilidade e condições diretamente na loja antes de comprar.`,
    cta: 'Ver detalhes e condições na loja parceira',
  };
}

export default function MarketingAgent({ products, summary }: { products: Product[]; summary: Summary }) {
  const rankedProducts = [...products].sort((first, second) => opportunity(second).score - opportunity(first).score);
  const [selectedProductId, setSelectedProductId] = useState(rankedProducts[0]?.id || '');
  const [copied, setCopied] = useState(false);
  const [abTests, setAbTests] = useState<AbTest[]>([]);
  const [isSavingTest, setIsSavingTest] = useState(false);
  const [testError, setTestError] = useState('');
  const [testForm, setTestForm] = useState({ variable: 'Gancho', hypothesis: '', variationA: '', variationB: '' });
  const selectedProduct = products.find((product) => product.id === selectedProductId) || rankedProducts[0];
  const campaign = selectedProduct ? campaignFor(selectedProduct) : null;
  const persona = selectedProduct ? personaFor(selectedProduct) : null;
  const funnel = selectedProduct ? funnelPlan(selectedProduct) : [];
  const social = selectedProduct ? socialPlan(selectedProduct) : null;
  const hotmart = selectedProduct ? hotmartPlan(selectedProduct) : null;
  const copy = selectedProduct && persona ? ethicalCopy(selectedProduct, persona) : [];
  const shopee = selectedProduct ? shopeePlan(selectedProduct) : null;
  const mercadoLivre = selectedProduct ? mercadoLivrePlan(selectedProduct) : null;
  const aliExpress = selectedProduct ? aliExpressPlan(selectedProduct) : null;
  const angles = selectedProduct && persona ? contentAngles(selectedProduct, persona) : [];
  const videos = selectedProduct ? videoKit(selectedProduct) : null;
  const distribution = selectedProduct ? distributionPlan(selectedProduct) : [];
  const funnelLosses = funnelLossPoints(summary);
  const testDecision = selectedProduct ? productTestDecision(selectedProduct, summary) : null;
  const learnings = learningActions(summary, selectedProduct);
  const nextOrchestratorAction = orchestratorAction(selectedProduct, summary);
  const topProducts = rankedProducts.slice(0, 5);
  const topTenProducts = rankedProducts.slice(0, 10);
  const lowestProduct = rankedProducts[rankedProducts.length - 1];
  const topCandidate = topProducts[0];
  const report = performanceReview(summary, selectedProduct);

  useEffect(() => {
    fetch('/api/admin/ab-tests').then((response) => response.ok ? response.json() : []).then(setAbTests).catch(() => setAbTests([]));
  }, []);

  async function saveAbTest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProduct) return;
    setIsSavingTest(true);
    setTestError('');
    try {
      const response = await fetch('/api/admin/ab-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: selectedProduct.id, ...testForm }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível salvar o teste.');
      setAbTests((currentTests) => [data, ...currentTests]);
      setTestForm({ variable: 'Gancho', hypothesis: '', variationA: '', variationB: '' });
    } catch (error) {
      setTestError(error instanceof Error ? error.message : 'Não foi possível salvar o teste.');
    } finally {
      setIsSavingTest(false);
    }
  }
  const confirmedInformation = selectedProduct ? [
    'Produto e página da oferta',
    `Preço atual: ${currency(selectedProduct.price)}`,
    `Comissão cadastrada: ${selectedProduct.commissionPercentage}%`,
    `Loja parceira: ${selectedProduct.marketplace?.name || 'não informada'}`,
    selectedProduct.description ? 'Descrição cadastrada' : 'Descrição não cadastrada',
    selectedProduct.salesCount ? `Vendas registradas: ${selectedProduct.salesCount}` : 'Sem vendas registradas',
  ] : [];
  const informationToConfirm = [
    'Público-alvo e concorrentes',
    'Políticas, prazo de entrega e formas de pagamento',
    'Garantia, avaliações e depoimentos autorizados',
    'Imagens e vídeos com autorização de uso',
    'Histórico de campanhas, orçamento e resultados anteriores',
  ];

  async function copyCampaign() {
    if (!selectedProduct || !campaign || !persona || !social || !hotmart) return;
    const content = `## PRODUTO\nNome: ${selectedProduct.name}\n\n## PLATAFORMA\n${selectedProduct.marketplace?.name || 'Não informada'}\n\n## PÚBLICO\n${persona.buyer}\n\n## OBJETIVO\nTráfego qualificado e conversão\n\n## ÂNGULO\n${campaign.angle}\n\n## GANCHO\n${campaign.hook}\n\n## ROTEIRO\n${campaign.script}\n\n## LEGENDA\n${campaign.caption}\n\n## CTA\n${campaign.cta}\n\n## 3 VARIAÇÕES\n${social.variations.map((variation, index) => `${index + 1}. ${variation}`).join('\n')}\n\n## ESTRATÉGIA DE DISTRIBUIÇÃO\n${distribution.map(([channel, formats, guidance]) => `${channel}: ${formats}. ${guidance}`).join('\n')}\n\n## TESTE A/B\nTeste ${testForm.variable.toLowerCase()} com uma única variável por vez. Compare impressões, CTR, cliques e conversões antes de decidir.\n\n## MÉTRICAS\nVendas, receita, margem, conversão, CTR, CPC, CPA, ROAS, CAC, ticket médio, abandono de carrinho, retenção e audiência qualificada.`;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  const calendar = selectedProduct ? [
    { day: 'Segunda', platform: 'Instagram', content: 'Reel de descoberta', objective: 'Descoberta', cta: 'Acompanhe mais dicas.', detail: 'Mostre uma necessidade comum e apresente o produto em contexto.' },
    { day: 'Terça', platform: 'Facebook', content: 'Post educativo', objective: 'Educação', cta: 'Veja os detalhes.', detail: 'Explique um recurso verificável que ajuda na decisão.' },
    { day: 'Quarta', platform: 'Instagram', content: 'Carrossel de dúvidas', objective: 'Relacionamento', cta: 'Envie sua dúvida.', detail: 'Responda objeções frequentes sem promessas não comprovadas.' },
    { day: 'Quinta', platform: 'Facebook', content: 'Demonstração com dados', objective: 'Prova', cta: 'Confira informações.', detail: 'Mostre detalhes verificáveis e informe o que confirmar na loja.' },
    { day: 'Sexta', platform: 'Instagram', content: 'Reel de conversão', objective: 'Conversão', cta: 'Ver detalhes na loja parceira.', detail: 'Apresente preço e condições reais, sem urgência artificial.' },
  ] : [];

  return (
    <section className="space-y-5 border-t border-gray-200 pt-8">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 text-blue-700"><Sparkles className="h-5 w-5" /><span className="text-xs font-bold uppercase">Agente de Marketing</span></div>
          <h2 className="mt-1 text-xl font-extrabold text-gray-900">Planejamento guiado por dados</h2>
          <p className="mt-1 max-w-3xl text-sm text-gray-500">Gestor virtual de marketing, vendas, e-commerce, marketplaces e afiliados, focado em oportunidades, ofertas, conteúdo, tráfego e lucro sustentável.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800"><ClipboardCheck className="h-4 w-4" /> Aguardando aprovação</span>
      </div>

      <div className="grid gap-3 rounded-lg border border-blue-100 bg-blue-50 p-4 text-xs text-gray-700 md:grid-cols-3">
        <div><strong className="block text-blue-900">Canais priorizados</strong><span className="mt-1 block">Shopee, Mercado Livre, AliExpress, Hotmart, Facebook, Instagram e site próprio.</span></div>
        <div><strong className="block text-blue-900">Ação proativa</strong><span className="mt-1 block">Planeja, cria, analisa e sugere otimizações a partir dos dados disponíveis.</span></div>
        <div><strong className="block text-blue-900">Conformidade</strong><span className="mt-1 block">Não publica, investe ou usa práticas que violem políticas, leis ou regras das plataformas.</span></div>
      </div>

      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
        <p className="text-xs font-bold uppercase text-blue-900">Missão de crescimento</p>
        <p className="mt-2 text-sm font-semibold text-gray-800">Pesquise → Analise → Priorize → Crie → Teste → Meça → Aprenda → Otimize</p>
        <p className="mt-2 text-xs text-gray-600">Transforme dados disponíveis em decisões práticas de marketing e vendas, equilibrando vendas, lucro, escala e sustentabilidade. Cada canal recebe conteúdo e condições compatíveis com suas regras, com respeito à legislação aplicável.</p>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-blue-600" /><h3 className="font-bold text-gray-900">Operação com 5 agentes especializados</h3></div>
        <p className="mt-1 text-xs text-gray-500">Agentes com responsabilidades definidas, coordenados pelo Orquestrador para transformar dados em uma rotina operacional de e-commerce.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-5">{[
          ['Caçador de Produtos', 'Pesquisa oportunidades em Shopee, Mercado Livre, AliExpress e Hotmart.', 'Pesquisa, nota e classificação de potencial.'],
          ['Estrategista', 'Seleciona produtos para teste e define público, posicionamento, preço e canal.', 'Priorização, persona, oferta e distribuição.'],
          ['Conteúdo', 'Cria Reels, posts, Stories, anúncios, títulos, descrições, roteiros e copies.', 'Peças por funil, canal e ângulo.'],
          ['Analista', 'Interpreta vendas e métricas para manter, pausar ou escalar testes.', 'Relatórios, testes A/B e aprendizados.'],
          ['Orquestrador', 'Coordena o trabalho diário e define a próxima ação de maior impacto.', 'Plano diário e ciclo de otimização.'],
        ].map(([name, role, deliverable], index) => <div key={name} className={`rounded-md border p-3 ${index === 4 ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}><p className="text-sm font-bold text-gray-900">{index + 1}. {name}</p><p className="mt-2 text-xs leading-relaxed text-gray-600">{role}</p><p className="mt-2 text-[11px] font-semibold text-blue-700">Entrega: {deliverable}</p></div>)}</div>
        <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3"><p className="text-xs font-bold uppercase text-blue-800">Próxima ação do Orquestrador</p><p className="mt-1 text-sm font-semibold text-gray-800">{nextOrchestratorAction}</p></div>
      </section>

      <div className="grid gap-5 rounded-lg border border-gray-200 bg-white p-5 lg:grid-cols-2">
        <div>
          <h3 className="flex items-center gap-2 font-bold text-gray-900"><Sparkles className="h-4 w-4 text-blue-600" /> Automação autorizada</h3>
          <p className="mt-1 text-xs text-gray-500">Executada dentro do sistema, sem interação automatizada com contas de terceiros.</p>
          <div className="mt-3 flex flex-wrap gap-2">{['Pesquisa', 'Planejamento de conteúdo', 'Ideias de campanha', 'Legendas e roteiros', 'Análise de métricas', 'Relatórios', 'Organização de produtos', 'Produtos promissores', 'Calendário editorial', 'Sugestões de campanha', 'Preparação de anúncios', 'Testes de copy'].map((task) => <span key={task} className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">{task}</span>)}</div>
          <p className="mt-4 text-xs leading-relaxed text-gray-600">Integrações com Facebook, Instagram, Hotmart ou outros canais serão usadas somente por APIs, integrações e métodos oficialmente permitidos, com escopo autorizado e aprovação antes de publicar ou investir.</p>
        </div>
        <div>
          <h3 className="flex items-center gap-2 font-bold text-gray-900"><ClipboardCheck className="h-4 w-4 text-red-600" /> Automação bloqueada</h3>
          <p className="mt-1 text-xs text-gray-500">O agente não executa práticas que violem políticas, manipulem métricas ou prejudiquem a reputação da marca.</p>
          <div className="mt-3 flex flex-wrap gap-2">{['Spam', 'Contas falsas', 'Compra de seguidores', 'Comentários abusivos', 'Mensagens em massa não autorizadas', 'Scraping proibido', 'Burla de limitações', 'Falsificação de identidade', 'Manipulação de métricas', 'Informações falsas', 'Cópia indevida de conteúdo protegido'].map((task) => <span key={task} className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-800">{task}</span>)}</div>
        </div>
      </div>

      <div className="grid gap-5 rounded-lg border border-gray-200 bg-white p-5 lg:grid-cols-2">
        <div>
          <h3 className="flex items-center gap-2 font-bold text-gray-900"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Autonomia de baixo risco</h3>
          <p className="mt-1 text-xs text-gray-500">O agente pode preparar e atualizar estes materiais sem ação externa.</p>
          <ul className="mt-3 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">{['Criar ideias', 'Preparar conteúdos', 'Organizar calendário', 'Analisar dados', 'Sugerir campanhas', 'Gerar relatórios'].map((action) => <li key={action} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />{action}</li>)}</ul>
        </div>
        <div>
          <h3 className="flex items-center gap-2 font-bold text-gray-900"><ClipboardCheck className="h-4 w-4 text-amber-600" /> Aprovação obrigatória</h3>
          <p className="mt-1 text-xs text-gray-500">Estas ações permanecem bloqueadas até confirmação explícita do proprietário.</p>
          <ul className="mt-3 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">{['Gastar ou aumentar orçamento', 'Criar campanhas pagas', 'Alterar preços ou descontos', 'Modificar políticas da loja', 'Excluir campanhas ou produtos', 'Publicar conteúdo sensível', 'Alterar configurações', 'Gerar obrigação financeira', 'Ações irreversíveis'].map((action) => <li key={action} className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4 shrink-0 text-amber-600" />{action}</li>)}</ul>
        </div>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2"><Target className="h-4 w-4 text-blue-600" /><h3 className="font-bold text-gray-900">Ciclo de trabalho do agente</h3></div>
        <p className="mt-1 text-xs text-gray-500">Cada campanha percorre estas etapas para aprender com dados e reduzir desperdício.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[
          ['1. Pesquisar', 'Analise produto, mercado, concorrência e público.'],
          ['2. Planejar', 'Defina produto, persona, ângulo, objetivo e canal.'],
          ['3. Criar', 'Produza peças, campanhas, roteiros e legendas.'],
          ['4. Validar', 'Confirme informações, políticas, coerência e materiais.'],
          ['5. Publicar', 'Exige autorização e integração oficial adequada.'],
          ['6. Medir', 'Colete cliques, conversões, receita e dados de canal.'],
          ['7. Aprender', 'Identifique padrões em campanhas e testes.'],
          ['8. Otimizar', 'Ajuste um elemento por vez com base nos resultados.'],
          ['9. Repetir', 'Inicie um novo ciclo com os aprendizados registrados.'],
        ].map(([stage, description]) => <div key={stage} className={`rounded-md border p-3 ${stage.startsWith('5.') ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}><p className="text-xs font-bold text-gray-900">{stage}</p><p className="mt-1 text-xs leading-relaxed text-gray-600">{description}</p></div>)}</div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-blue-600" /><h3 className="font-bold text-gray-900">Regras fundamentais do agente</h3></div>
        <p className="mt-1 text-xs text-gray-500">O objetivo é um sistema que aprende continuamente, aumenta vendas e reduz desperdício, não apenas publicar mais.</p>
        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          <div><h4 className="text-xs font-bold uppercase text-emerald-700">Sempre</h4><ul className="mt-3 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">{['Orientado a resultados', 'Baseado em dados', 'Lucro sustentável', 'Testar hipóteses', 'Aprender com resultados', 'Adaptar por plataforma', 'Respeitar políticas', 'Proteger a reputação', 'Ser transparente'].map((rule) => <li key={rule} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />{rule}</li>)}</ul></div>
          <div><h4 className="text-xs font-bold uppercase text-red-700">Nunca</h4><ul className="mt-3 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">{['Inventar informações', 'Fazer promessas falsas', 'Falsificar avaliações', 'Criar escassez falsa', 'Enviar spam', 'Burlar sistemas', 'Usar contas falsas', 'Manipular métricas', 'Anunciar oferta não verificada', 'Gastar sem autorização'].map((rule) => <li key={rule} className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4 shrink-0 text-red-600" />{rule}</li>)}</ul></div>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-blue-600" /><h3 className="font-bold text-gray-900">Top 10 produtos</h3></div>
        <p className="mt-1 text-xs text-gray-500">Ordenado por nota de oportunidade. Confirme os dados da oferta antes de divulgar.</p>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="border-b border-gray-200 text-gray-500"><tr><th className="pb-2 pr-3">Produto</th><th className="pb-2 pr-3">Plataforma</th><th className="pb-2 pr-3">Nota</th><th className="pb-2 pr-3">Potencial</th><th className="pb-2 pr-3">Margem</th><th className="pb-2">Estratégia</th></tr></thead><tbody className="divide-y divide-gray-100">{topTenProducts.map((product) => { const assessment = opportunity(product); return <tr key={product.id}><td className="py-3 pr-3 font-semibold text-gray-900">{product.name}</td><td className="py-3 pr-3 text-gray-600">{product.marketplace?.name || 'Não informada'}</td><td className="py-3 pr-3 font-bold text-blue-700">{assessment.score}/100</td><td className="py-3 pr-3"><span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${assessment.style}`}>{assessment.label}</span></td><td className="py-3 pr-3 text-gray-700">{product.commissionPercentage}% comissão</td><td className="py-3 text-gray-600">{assessment.score >= 80 ? 'Priorizar conteúdo e validar teste.' : assessment.score >= 60 ? 'Testar um criativo e medir conversão.' : 'Completar dados antes de investir.'}</td></tr>; })}{!topTenProducts.length && <tr><td colSpan={6} className="py-4 text-gray-500">Nenhum produto cadastrado.</td></tr>}</tbody></table></div>
        {topTenProducts.length >= 3 && <div className="mt-4 grid gap-3 md:grid-cols-3">{topTenProducts.slice(0, 3).map((product, index) => <div key={product.id} className="rounded-md bg-gray-50 p-3 text-xs"><p className="font-bold text-gray-900">{index + 1}. {product.name}</p><p className="mt-1 text-gray-600">Nota {opportunity(product).score}/100: {opportunity(product).reasons.join('; ')}.</p></div>)}</div>}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="flex items-center gap-2 font-bold text-gray-900"><Target className="h-4 w-4 text-blue-600" /> Objetivos por prioridade</h3>
          <ol className="mt-3 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
            {['Aumentar vendas', 'Aumentar tráfego qualificado', 'Aumentar conversões', 'Construir uma audiência', 'Aumentar engajamento', 'Identificar produtos com potencial', 'Reduzir o custo de aquisição', 'Otimizar com base nos dados'].map((objective, index) => (
              <li key={objective} className="flex items-center gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">{index + 1}</span>{objective}</li>
            ))}
          </ol>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="flex items-center gap-2 font-bold text-gray-900"><FileText className="h-4 w-4 text-blue-600" /> Métricas de decisão</h3>
          <p className="mt-2 text-xs leading-relaxed text-gray-600">Avalie campanhas por resultado de negócio, não apenas por curtidas ou seguidores.</p>
          <div className="mt-3 flex flex-wrap gap-2">{['Vendas', 'Receita', 'Margem', 'Conversão', 'CTR', 'CPC', 'CPA', 'ROAS', 'CAC', 'Ticket médio', 'Abandono de carrinho', 'Retenção', 'Audiência qualificada'].map((metric) => <span key={metric} className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-700">{metric}</span>)}</div>
        </div>
      </div>

      <div className="grid gap-5 rounded-lg border border-gray-200 bg-white p-5 lg:grid-cols-2">
        <div>
          <h3 className="flex items-center gap-2 font-bold text-gray-900"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Informações verificadas no sistema</h3>
          <p className="mt-1 text-xs text-gray-500">Usadas pelo agente apenas quando cadastradas para o produto selecionado.</p>
          <ul className="mt-3 space-y-2 text-sm text-gray-700">{confirmedInformation.map((information) => <li key={information} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{information}</li>)}</ul>
        </div>
        <div>
          <h3 className="flex items-center gap-2 font-bold text-gray-900"><ClipboardCheck className="h-4 w-4 text-amber-600" /> Confirmação necessária antes de divulgar</h3>
          <p className="mt-1 text-xs text-gray-500">Informe estes dados ao proprietário antes de transformar o rascunho em publicação.</p>
          <ul className="mt-3 space-y-2 text-sm text-gray-700">{informationToConfirm.map((information) => <li key={information} className="flex gap-2"><ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />{information}</li>)}</ul>
        </div>
      </div>

      {selectedProduct && <div className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center"><div><h3 className="flex items-center gap-2 font-bold text-gray-900"><TrendingUp className="h-4 w-4 text-blue-600" /> Pesquisa comercial: {selectedProduct.name}</h3><p className="mt-1 text-xs text-gray-500">Nota de oportunidade entre 0 e 100, com sinais verificáveis de lucro e conversão.</p></div><span className={`w-fit rounded-full border px-2.5 py-1 text-[10px] font-bold ${opportunity(selectedProduct).style}`}>{opportunity(selectedProduct).score}/100 · {opportunity(selectedProduct).label}</span></div>
        <div className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">{researchCriteria(selectedProduct).map(([label, detail, verified]) => <div key={label} className="border-b border-gray-100 pb-3"><p className="text-xs font-bold text-gray-800">{label}</p><p className={`mt-1 text-xs ${verified ? 'text-emerald-700' : 'text-amber-700'}`}>{verified ? 'Verificado: ' : 'Validar: '}{detail}</p></div>)}</div>
        <p className="mt-4 rounded-md bg-gray-50 p-3 text-xs leading-relaxed text-gray-600"><strong className="text-gray-800">Por que recebeu esta nota: </strong>{opportunity(selectedProduct).reasons.join('; ')}.</p>
      </div>}

      {selectedProduct && persona && <div className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2"><Target className="h-4 w-4 text-blue-600" /><h3 className="font-bold text-gray-900">Persona de campanha: {selectedProduct.name}</h3></div>
        <p className="mt-1 text-xs text-gray-500">Hipótese baseada no tipo de produto. Use dados agregados e autorizados para validar antes de segmentar.</p>
        <div className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries({ 'Quem provavelmente compra': persona.buyer, 'Faixa etária': persona.age, Interesses: persona.interests, Problemas: persona.problems, Desejos: persona.desires, Objeções: persona.objections, 'Motivadores de compra': persona.motivators, 'Linguagem adequada': persona.language, 'Benefícios procurados': persona.benefits }).map(([label, detail]) => <div key={label} className="border-b border-gray-100 pb-3"><p className="text-xs font-bold text-gray-800">{label}</p><p className="mt-1 text-xs leading-relaxed text-gray-600">{detail}</p></div>)}
        </div>
      </div>}

      {selectedProduct && shopee?.isShopee && <div className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2"><Megaphone className="h-4 w-4 text-orange-600" /><h3 className="font-bold text-gray-900">Plano específico para Shopee</h3></div>
        <p className="mt-1 text-xs text-gray-500">Rascunhos baseados em dados cadastrados. Revise regras da Shopee e condições da oferta antes de divulgar.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <CampaignField title="Título sugerido" content={shopee.title} />
          <CampaignField title="Descrição aprimorada" content={shopee.description} />
          <CampaignField title="Benefícios" content={shopee.benefits} />
          <CampaignField title="Palavras-chave" content={shopee.keywords} />
          <CampaignField title="Ideia de imagens" content={shopee.image} />
          <CampaignField title="Roteiro de vídeo" content={shopee.video} />
          <CampaignField title="Preço e promoção" content={shopee.price} />
          <CampaignField title="Concorrência" content={shopee.competition} />
          <CampaignField title="Conteúdo social" content={`Use o gancho e a legenda da campanha de ${selectedProduct.name}, adaptados a Reel, Story, vídeo curto ou post informativo.`} />
        </div>
      </div>}

      {selectedProduct && mercadoLivre?.isMercadoLivre && <div className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2"><Megaphone className="h-4 w-4 text-yellow-600" /><h3 className="font-bold text-gray-900">Plano específico para Mercado Livre</h3></div>
        <p className="mt-1 text-xs text-gray-500">Otimização de oferta com foco em clareza, confiança e conversão. Revise as políticas e os dados oficiais antes de publicar.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <CampaignField title="Título objetivo" content={mercadoLivre.title} />
          <CampaignField title="Descrição estruturada" content={mercadoLivre.description} />
          <CampaignField title="Diferenciais" content={mercadoLivre.differentials} />
          <CampaignField title="Palavras-chave" content={mercadoLivre.keywords} />
          <CampaignField title="Objeções" content={mercadoLivre.objections} />
          <CampaignField title="Perguntas e respostas" content={mercadoLivre.questions} />
          <CampaignField title="Apresentação da oferta" content={mercadoLivre.presentation} />
          <CampaignField title="Conteúdo para redes sociais" content={mercadoLivre.social} />
          <CampaignField title="Indicadores disponíveis" content={mercadoLivre.metrics} />
        </div>
      </div>}

      {selectedProduct && aliExpress?.isAliExpress && <div className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-red-600" /><h3 className="font-bold text-gray-900">Pesquisa e triagem para AliExpress</h3></div>
        <p className={`mt-2 rounded-md p-3 text-xs leading-relaxed ${aliExpress.eligible ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>{aliExpress.status}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{aliExpress.checks.map(([label, detail, verified]) => <div key={label} className="rounded-md border border-gray-200 p-3"><p className="text-xs font-bold text-gray-800">{label}</p><p className={`mt-1 text-xs leading-relaxed ${verified ? 'text-emerald-700' : 'text-amber-700'}`}>{verified ? 'Verificado: ' : 'Pendente: '}{detail}</p></div>)}</div>
        <div className="mt-4 grid gap-4 md:grid-cols-2"><CampaignField title="Pesquisa de oportunidade" content={aliExpress.research} /><CampaignField title="Ideia de conteúdo" content={aliExpress.content} /></div>
      </div>}

      {selectedProduct && <div className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2"><Megaphone className="h-4 w-4 text-blue-600" /><h3 className="font-bold text-gray-900">Estratégia de conteúdo por funil</h3></div>
        <p className="mt-1 text-xs text-gray-500">Conteúdo adaptável para Facebook e Instagram. A etapa de conversão não cria escassez ou urgência artificial.</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">{funnel.map((stage) => <article key={stage.stage} className="border-l-4 border-blue-600 bg-gray-50 p-4"><h4 className="font-bold text-gray-900">{stage.stage}</h4><p className="mt-1 text-xs font-semibold text-blue-700">{stage.goal}</p><p className="mt-3 text-xs leading-relaxed text-gray-600"><strong className="text-gray-800">Formatos: </strong>{stage.formats}</p><p className="mt-3 text-sm leading-relaxed text-gray-700">{stage.idea}</p></article>)}</div>
      </div>}

      {selectedProduct && social && <div className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2"><Megaphone className="h-4 w-4 text-blue-600" /><h3 className="font-bold text-gray-900">Peças para Facebook e Instagram</h3></div>
        <p className="mt-1 text-xs text-gray-500">Rascunho de conteúdo nativo, útil e não repetitivo. Revise as políticas vigentes e aprove antes de publicar.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <CampaignField title="Título" content={social.title} />
          <CampaignField title="Descrição" content={social.description} />
          <CampaignField title="Hashtags" content={social.hashtags} />
          <CampaignField title="Conceito visual" content={social.visual} />
          <CampaignField title="Ideia de vídeo" content={social.video} />
          <CampaignField title="Instagram" content={social.instagram} />
          <CampaignField title="Facebook" content={social.facebook} />
          <CampaignField title="Variações para teste" content={social.variations.join('\n\n')} wide />
        </div>
        <div className="mt-4"><p className="text-xs font-bold uppercase text-gray-500">Matriz de conteúdo para aquisição de tráfego</p><div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{social.contentTypes.map(([format, objective, idea]) => <div key={format} className="rounded-md border border-gray-200 p-3"><div className="flex items-center justify-between gap-2"><p className="text-xs font-bold text-gray-800">{format}</p><span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">{objective}</span></div><p className="mt-2 text-xs leading-relaxed text-gray-600">{idea}</p><p className="mt-2 whitespace-pre-line text-[11px] leading-relaxed text-gray-500">{social.structure}</p></div>)}</div></div>
      </div>}

      {selectedProduct && opportunity(selectedProduct).score >= 80 && <div className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-blue-600" /><h3 className="font-bold text-gray-900">Biblioteca de ângulos para produto prioritário</h3></div>
        <p className="mt-1 text-xs text-gray-500">Varie o ângulo antes de repetir o formato. Todos os textos devem ser revisados com os dados oficiais do produto.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">{angles.map(([title, content]) => <CampaignField key={title} title={title} content={content} />)}</div>
      </div>}

      {selectedProduct && videos && opportunity(selectedProduct).score >= 80 && <div className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2"><Megaphone className="h-4 w-4 text-blue-600" /><h3 className="font-bold text-gray-900">Kit de vídeos para produto prioritário</h3></div>
        <p className="mt-1 text-xs text-gray-500">Os primeiros segundos devem chamar atenção com uma dúvida ou detalhe verificável. Revise mídia, condições e políticas antes de publicar.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <CampaignField title="5 ganchos" content={videos.hooks.map((item, index) => `${index + 1}. ${item}`).join('\n')} />
          <CampaignField title="3 roteiros" content={videos.scripts.map((item, index) => `Roteiro ${index + 1}\n${item}`).join('\n\n')} />
          <CampaignField title="3 CTAs" content={videos.ctas.map((item, index) => `${index + 1}. ${item}`).join('\n')} />
          <CampaignField title="3 legendas" content={videos.captions.map((item, index) => `${index + 1}. ${item}`).join('\n\n')} />
          <CampaignField title="3 ideias de thumbnail" content={videos.thumbnails.map((item, index) => `${index + 1}. ${item}`).join('\n')} />
          <CampaignField title="5 ideias de vídeos curtos" content={videos.videos.map((item, index) => `${index + 1}. ${item}`).join('\n')} />
        </div>
      </div>}

      {selectedProduct && opportunity(selectedProduct).score >= 60 && <div className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2"><Target className="h-4 w-4 text-blue-600" /><h3 className="font-bold text-gray-900">Plano de distribuição por canal</h3></div>
        <p className="mt-1 text-xs text-gray-500">Produto com potencial de teste ou prioridade. O plano prepara materiais, mas não publica automaticamente.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">{distribution.map(([channel, formats, guidance]) => <div key={channel} className="rounded-md border border-gray-200 p-3"><p className="text-sm font-bold text-gray-900">{channel}</p><p className="mt-1 text-xs font-semibold text-blue-700">{formats}</p><p className="mt-2 text-xs leading-relaxed text-gray-600">{guidance}</p></div>)}</div>
        <p className="mt-4 rounded-md bg-amber-50 p-3 text-xs font-semibold text-amber-800">Publicação só pode ocorrer após aprovação explícita e por integrações ou métodos oficialmente autorizados em cada plataforma.</p>
      </div>}

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-blue-600" /><h3 className="font-bold text-gray-900">Funil e pontos de perda</h3></div>
        <p className="mt-1 text-xs text-gray-500">Conteúdo → Interesse → Cliques → Página do produto → Compra → Pós-venda → Recompra/Indicação</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">{funnelLosses.map(([stage, lossPoint, dataNeed]) => <div key={stage} className="rounded-md border border-gray-200 p-3"><p className="text-xs font-bold text-gray-900">{stage}</p><p className="mt-2 text-xs leading-relaxed text-gray-700"><strong>Possível perda: </strong>{lossPoint}</p><p className="mt-2 text-[11px] leading-relaxed text-amber-700">Para confirmar: {dataNeed}</p></div>)}</div>
      </section>

      {selectedProduct && testDecision && <section className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h3 className="flex items-center gap-2 font-bold text-gray-900"><BarChart3 className="h-4 w-4 text-blue-600" /> Teste e decisão do produto</h3><p className="mt-1 text-xs text-gray-500">Não escale sem validar desempenho por canal, criativo e conversão.</p></div><span className={`w-fit rounded-full border px-3 py-1 text-xs font-bold ${testDecision.style}`}>{testDecision.label}</span></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
          ['1. Pesquisar', 'Demanda, tendência, concorrência e oferta.'],
          ['2. Validar', 'Dados, página, preço, comissão e políticas.'],
          ['3. Criar e testar', 'Conteúdo e uma variável por teste A/B.'],
          ['4. Medir e comparar', 'Cliques, CTR, conversões, receita e margem.'],
          ['5. Selecionar', 'Escolha vencedores somente com dados suficientes.'],
          ['6. Escalar', 'Requer aprovação antes de aumentar investimento.'],
        ].map(([stage, detail]) => <div key={stage} className="rounded-md bg-gray-50 p-3"><p className="text-xs font-bold text-gray-800">{stage}</p><p className="mt-1 text-xs text-gray-600">{detail}</p></div>)}</div>
        <p className="mt-4 rounded-md bg-gray-50 p-3 text-xs leading-relaxed text-gray-700"><strong>Decisão atual: </strong>{testDecision.reason}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold"><span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-800">VENCEDOR</span><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-800">ESCALAR</span><span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">CONTINUAR TESTANDO</span><span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">PAUSAR</span><span className="rounded-full bg-red-50 px-2.5 py-1 text-red-700">DESCARTAR</span></div>
      </section>}

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-blue-600" /><h3 className="font-bold text-gray-900">Princípio de aprendizado</h3></div>
        <p className="mt-2 rounded-md bg-blue-50 p-3 text-sm font-semibold text-blue-900">O que os dados estão tentando me mostrar?</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">{learnings.map((learning) => <div key={learning} className="border-l-2 border-blue-600 bg-gray-50 p-3 text-sm leading-relaxed text-gray-700">{learning}</div>)}</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-xs"><div className="rounded-md border border-gray-200 p-3"><strong className="text-gray-800">Visualizações altas e poucos cliques</strong><p className="mt-1 text-gray-600">Melhore CTA ou oferta. Requer visualizações e cliques por conteúdo.</p></div><div className="rounded-md border border-gray-200 p-3"><strong className="text-gray-800">Vídeo com alto alcance</strong><p className="mt-1 text-gray-600">Crie variações do mesmo conceito. Requer alcance por vídeo.</p></div><div className="rounded-md border border-gray-200 p-3"><strong className="text-gray-800">Vendas consistentes</strong><p className="mt-1 text-gray-600">Teste novos conteúdos e ângulos antes de escalar investimento.</p></div></div>
      </section>

      {selectedProduct && hotmart && <div className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-blue-600" /><h3 className="font-bold text-gray-900">Avaliação para Hotmart</h3></div>
        <p className="mt-2 rounded-md bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">{hotmart.status}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">{hotmart.checks.map(([label, detail]) => <div key={label} className="rounded-md border border-gray-200 p-3"><p className="text-xs font-bold text-gray-800">{label}</p><p className="mt-1 text-xs leading-relaxed text-gray-600">{detail}</p></div>)}</div>
        {hotmart.isHotmartProduct && <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3"><CampaignField title="Potencial e comissão" content={hotmart.potential} /><CampaignField title="Conteúdo de descoberta" content={hotmart.discovery} /><CampaignField title="Conteúdo educativo" content={hotmart.educational} /><CampaignField title="Conteúdo de conversão" content={hotmart.conversion} /><CampaignField title="Roteiro para Reel" content={hotmart.reel} /><CampaignField title="Ideia de post" content={hotmart.post} /><CampaignField title="CTAs" content={hotmart.ctas} /><CampaignField title="Estratégia de afiliado" content={hotmart.strategy} /></div>}
        <p className="mt-4 text-xs font-semibold text-gray-600">Qualquer divulgação que dependa de autorização do produtor, condição comercial ou integração oficial deve ser confirmada pelo proprietário antes da execução.</p>
      </div>}

      {selectedProduct && <div className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-blue-600" /><h3 className="font-bold text-gray-900">Copywriting ético</h3></div>
        <p className="mt-1 text-xs text-gray-500">Linguagem adaptada à persona, com informações verificáveis e sem manipulação enganosa.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">{copy.map(([label, content]) => <CampaignField key={label} title={label} content={content} />)}</div>
      </div>}

      {selectedProduct && <div className="grid gap-5 rounded-lg border border-gray-200 bg-white p-5 lg:grid-cols-2">
        <div>
          <h3 className="flex items-center gap-2 font-bold text-gray-900"><BarChart3 className="h-4 w-4 text-blue-600" /> Planejar teste A/B</h3>
          <p className="mt-1 text-xs text-gray-500">Teste uma variável por vez para identificar o impacto real nos resultados.</p>
          <form onSubmit={saveAbTest} className="mt-4 space-y-3">
            <label className="block text-xs font-bold text-gray-700">Variável testada<select value={testForm.variable} onChange={(event) => setTestForm({ ...testForm, variable: event.target.value })} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-normal"><option>Gancho</option><option>Imagem</option><option>Vídeo</option><option>Título</option><option>CTA</option><option>Oferta</option><option>Ângulo</option><option>Formato</option><option>Público</option></select></label>
            <label className="block text-xs font-bold text-gray-700">Hipótese<textarea required minLength={5} value={testForm.hypothesis} onChange={(event) => setTestForm({ ...testForm, hypothesis: event.target.value })} placeholder="Ex.: Um gancho de comparação aumenta o CTR." className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-normal" rows={2} /></label>
            <div className="grid gap-3 sm:grid-cols-2"><label className="block text-xs font-bold text-gray-700">Variação A<textarea required minLength={3} value={testForm.variationA} onChange={(event) => setTestForm({ ...testForm, variationA: event.target.value })} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-normal" rows={2} /></label><label className="block text-xs font-bold text-gray-700">Variação B<textarea required minLength={3} value={testForm.variationB} onChange={(event) => setTestForm({ ...testForm, variationB: event.target.value })} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-normal" rows={2} /></label></div>
            {testError && <p className="text-xs text-red-600">{testError}</p>}
            <button disabled={isSavingTest} className="rounded-md bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60">{isSavingTest ? 'Salvando...' : 'Registrar teste para aprovação'}</button>
          </form>
        </div>
        <div>
          <h3 className="flex items-center gap-2 font-bold text-gray-900"><ClipboardCheck className="h-4 w-4 text-blue-600" /> Histórico de testes</h3>
          <p className="mt-1 text-xs text-gray-500">Registros persistidos; resultados devem ser preenchidos após volume suficiente de dados.</p>
          <div className="mt-4 max-h-80 space-y-3 overflow-y-auto">{abTests.filter((test) => test.product_id === selectedProduct.id).map((test) => <div key={test.id} className="rounded-md border border-gray-200 p-3 text-xs"><div className="flex justify-between gap-2"><strong className="text-gray-800">{test.variable}: {test.status === 'PLANNED' ? 'Planejado' : test.status}</strong><span className="text-gray-500">{test.impressions} impressões · {test.clicks} cliques · {test.conversions} conversões</span></div><p className="mt-2 text-gray-600">{test.hypothesis}</p><p className="mt-2 text-gray-700"><strong>A:</strong> {test.variation_a}</p><p className="mt-1 text-gray-700"><strong>B:</strong> {test.variation_b}</p></div>)}{!abTests.some((test) => test.product_id === selectedProduct.id) && <p className="rounded-md bg-gray-50 p-4 text-sm text-gray-500">Nenhum teste registrado para este produto.</p>}</div>
        </div>
      </div>}

      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center"><div><h3 className="flex items-center gap-2 font-bold text-gray-900"><BarChart3 className="h-4 w-4 text-blue-600" /> Relatório periódico de desempenho</h3><p className="mt-1 text-xs text-gray-500">Consolidado com os dados atualmente conectados ao sistema.</p></div><span className="text-xs font-semibold text-gray-500">Atualizado ao carregar o painel</span></div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="rounded-md bg-gray-50 p-4"><h4 className="font-bold text-gray-900">Conteúdo</h4><dl className="mt-3 space-y-2 text-xs text-gray-600"><MetricLine label="Publicações realizadas" value="Aguardando integração oficial" /><MetricLine label="Alcance" value="Aguardando integração oficial" /><MetricLine label="Visualizações" value="Aguardando integração oficial" /><MetricLine label="Engajamento" value="Aguardando integração oficial" /><MetricLine label="Cliques" value={String(summary.totalClicks)} /><MetricLine label="CTR" value="Requer impressões por campanha" /></dl></div>
          <div className="rounded-md bg-gray-50 p-4"><h4 className="font-bold text-gray-900">Vendas</h4><dl className="mt-3 space-y-2 text-xs text-gray-600"><MetricLine label="Pedidos / conversões" value={String(summary.totalConversions)} /><MetricLine label="Faturamento / receita" value={currency(summary.totalSaleValue)} /><MetricLine label="Produto em análise" value={selectedProduct?.name || 'Não selecionado'} /><MetricLine label="Taxa de conversão" value={`${summary.conversionRate}%`} /><MetricLine label="Ticket médio" value={report.ticket} /></dl></div>
          <div className="rounded-md bg-gray-50 p-4"><h4 className="font-bold text-gray-900">Custos e lucro</h4><dl className="mt-3 space-y-2 text-xs text-gray-600"><MetricLine label="Comissões registradas" value={currency(summary.commissions.total)} /><MetricLine label="Custo por unidade" value={selectedProduct?.cost !== undefined && selectedProduct?.cost !== null ? currency(selectedProduct.cost) : 'Não informado'} /><MetricLine label="Lucro estimado por unidade" value={report.unitProfit} /><MetricLine label="Despesas de marketing" value="Não registradas" /><MetricLine label="Lucro consolidado" value="Não calculável sem custos e despesas atribuídos" /></dl></div>
          <div className="rounded-md bg-gray-50 p-4"><h4 className="font-bold text-gray-900">Marketing</h4><dl className="mt-3 space-y-2 text-xs text-gray-600"><MetricLine label="CAC" value="Requer gasto e clientes novos" /><MetricLine label="CPA" value="Requer gasto por campanha" /><MetricLine label="CPC" value="Requer gasto por clique" /><MetricLine label="ROAS" value="Requer receita e gasto atribuídos" /><MetricLine label="ROI" value="Requer custos consolidados" /></dl></div>
        </div>
        <p className="mt-4 rounded-md bg-amber-50 p-3 text-xs font-semibold text-amber-800">Lucro = Receita − Custos − Comissões − Despesas de marketing. Faturamento não é lucro; o cálculo consolidado só aparece quando todos esses dados estiverem atribuídos.</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">{[['O que funcionou?', report.worked], ['O que não funcionou?', report.failed], ['Por quê?', report.why], ['O que manter?', report.keep], ['O que alterar?', report.change], ['Próximo teste', report.next]].map(([title, detail]) => <div key={title} className="border-l-2 border-blue-600 py-1 pl-3"><p className="text-xs font-bold text-gray-800">{title}</p><p className="mt-1 text-xs leading-relaxed text-gray-600">{detail}</p></div>)}</div>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-blue-600" /><h3 className="font-bold text-gray-900">Relatório automático</h3></div>
        <p className="mt-1 text-xs text-gray-500">Atualizado com os dados disponíveis ao carregar o painel. Rankings de produtos são por nota de oportunidade, não substituem atribuição de vendas por campanha.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-md bg-gray-50 p-4"><h4 className="text-xs font-bold uppercase text-gray-500">Resumo</h4><dl className="mt-3 space-y-2 text-sm text-gray-700"><MetricLine label="Total de vendas" value={String(summary.totalConversions)} /><MetricLine label="Faturamento" value={currency(summary.totalSaleValue)} /><MetricLine label="Lucro estimado" value="Não calculável sem custos e despesas" /><MetricLine label="Produto campeão" value={topCandidate ? `${topCandidate.name} (candidato: ${opportunity(topCandidate).score}/100)` : 'Sem produtos'} /><MetricLine label="Pior desempenho" value={lowestProduct ? `${lowestProduct.name} (${opportunity(lowestProduct).score}/100)` : 'Sem produtos'} /></dl></div>
          <div className="rounded-md bg-gray-50 p-4"><h4 className="text-xs font-bold uppercase text-gray-500">Top produtos</h4><ol className="mt-3 space-y-2 text-sm text-gray-700">{topProducts.map((product, index) => <li key={product.id} className="flex gap-2"><span className="font-bold text-blue-700">{index + 1}.</span><span>{product.name}<small className="ml-1 text-gray-500">({opportunity(product).score}/100)</small></span></li>)}{!topProducts.length && <li>Sem produtos cadastrados.</li>}</ol></div>
          <div className="rounded-md bg-gray-50 p-4"><h4 className="text-xs font-bold uppercase text-gray-500">Top conteúdos</h4><p className="mt-3 text-sm leading-relaxed text-gray-600">Ainda não há publicações, alcance, visualizações ou engajamento por conteúdo conectados. Integre as APIs oficiais antes de classificar conteúdos.</p></div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3"><CampaignField title="O que funcionou" content={summary.totalConversions > 0 ? `Há ${summary.totalConversions} conversões registradas. Os produtos com melhor nota combinam sinais de tendência, comissão, vendas e informações completas.` : 'Não há conversões suficientes para confirmar padrões de sucesso. A base atual ajuda a priorizar hipóteses, não a concluir desempenho.'} /><CampaignField title="O que não funcionou" content="Não há dados de conteúdo ou campanha por canal para identificar uma peça com baixo desempenho. Lacunas de descrição, benefícios, concorrência e custos reduzem a qualidade das decisões." /><CampaignField title="Próximas ações" content="1. Complete os dados verificados dos produtos prioritários.\n2. Registre um teste A/B com uma única variável.\n3. Publique somente após aprovação e por integração oficial.\n4. Conecte métricas de canal e gastos.\n5. Compare conversão, receita e lucro antes de escalar." /></div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-blue-600" /><h3 className="font-bold text-gray-900">Rotina diária do agente</h3></div>
        <p className="mt-1 text-xs text-gray-500">Execute quando os dados e integrações necessárias estiverem conectados. Ações externas continuam sujeitas a aprovação.</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">{[
          ['Manhã', ['Verificar vendas', 'Verificar produtos', 'Verificar campanhas', 'Verificar desempenho', 'Identificar oportunidades', 'Identificar problemas']],
          ['Durante o dia', ['Produzir conteúdos', 'Adaptar conteúdos por canal', 'Testar novos ângulos', 'Acompanhar desempenho']],
          ['Final do dia', ['Analisar resultados', 'Registrar aprendizados', 'Identificar produtos vencedores', 'Preparar ações do dia seguinte']],
        ].map(([period, actions]) => <div key={String(period)} className="rounded-md bg-gray-50 p-4"><h4 className="text-sm font-bold text-gray-900">{String(period)}</h4><ol className="mt-3 space-y-2 text-sm text-gray-700">{(actions as string[]).map((action, index) => <li key={action} className="flex gap-2"><span className="font-bold text-blue-700">{index + 1}.</span>{action}</li>)}</ol></div>)}</div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-blue-600" /><h3 className="font-bold text-gray-900">Rotina semanal do agente</h3></div>
        <p className="mt-1 text-xs text-gray-500">Revisão estratégica para manter o portfólio, o calendário e os testes alinhados aos resultados.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[
          ['Analisar produtos', 'Revise nota de oportunidade, dados completos e potencial de lucro.'],
          ['Analisar concorrentes', 'Atualize comparativos somente com fontes e dados permitidos.'],
          ['Analisar conteúdos', 'Compare alcance, CTR, conversão e engajamento quando disponíveis.'],
          ['Identificar tendências', 'Priorize sinais cadastrados e valide tendências externas antes de agir.'],
          ['Selecionar testes', 'Escolha produtos e uma variável por experimento A/B.'],
          ['Eliminar produtos fracos', 'Pause ou descarte com base em dados, nunca por impressão isolada.'],
          ['Criar calendário', 'Equilibre descoberta, educação, prova, relacionamento e conversão.'],
          ['Propor campanhas', 'Prepare novos ângulos e materiais para aprovação.'],
          ['Revisar métricas', 'Avalie vendas, receita, custos, conversão e eficiência de aquisição.'],
        ].map(([action, detail]) => <div key={action} className="rounded-md border border-gray-200 bg-gray-50 p-3"><p className="text-sm font-bold text-gray-900">{action}</p><p className="mt-1 text-xs leading-relaxed text-gray-600">{detail}</p></div>)}</div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_1.9fr]">
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-100 p-4"><h3 className="flex items-center gap-2 font-bold text-gray-900"><TrendingUp className="h-4 w-4 text-blue-600" /> Potencial de divulgação</h3><p className="mt-1 text-xs text-gray-500">Prioridade calculada por score, tendência, vendas e comissão.</p></div>
          <div className="max-h-80 divide-y divide-gray-100 overflow-y-auto">
            {rankedProducts.map((product) => {
              const assessment = opportunity(product);
              return <button key={product.id} type="button" onClick={() => setSelectedProductId(product.id)} className={`w-full p-4 text-left hover:bg-gray-50 ${selectedProduct?.id === product.id ? 'bg-blue-50/60' : ''}`}>
                <div className="flex items-start justify-between gap-3"><span className="line-clamp-2 text-sm font-bold text-gray-800">{product.name}</span><span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${assessment.style}`}>{assessment.label}</span></div>
                <p className="mt-2 text-xs text-gray-500">Nota: {assessment.score}/100 · Comissão: {product.commissionPercentage}% · Vendas registradas: {product.salesCount || 0}</p>
              </button>;
            })}
            {!rankedProducts.length && <p className="p-4 text-sm text-gray-500">Cadastre produtos para gerar recomendações.</p>}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h3 className="flex items-center gap-2 font-bold text-gray-900"><Megaphone className="h-4 w-4 text-blue-600" /> Gerador de campanha</h3><p className="mt-1 text-xs text-gray-500">Baseado apenas nos dados cadastrados do produto.</p></div><select value={selectedProductId} onChange={(event) => setSelectedProductId(event.target.value)} className="max-w-full rounded-md border border-gray-300 px-3 py-2 text-sm"><option value="">Selecione um produto</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></div>
          {selectedProduct && campaign && <div className="mt-5 grid gap-4 text-sm md:grid-cols-2">
            <CampaignField title="Produto" content={selectedProduct.name} />
            <CampaignField title="Objetivo" content="Tráfego qualificado e conversão" />
            <CampaignField title="Público" content={campaign.audience} />
            <CampaignField title="Ângulo" content={campaign.angle} />
            <CampaignField title="Gancho" content={campaign.hook} />
            <CampaignField title="CTA" content={campaign.cta} />
            <CampaignField title="Roteiro" content={campaign.script} wide />
            <CampaignField title="Legenda" content={campaign.caption} wide />
            <div className="md:col-span-2"><button type="button" onClick={copyCampaign} className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700">{copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? 'Campanha copiada' : 'Copiar campanha para revisão'}</button></div>
          </div>}
        </div>
      </div>

      {selectedProduct && <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-5"><h3 className="flex items-center gap-2 font-bold text-gray-900"><CalendarDays className="h-4 w-4 text-blue-600" /> Calendário semanal</h3><p className="mt-1 text-xs text-gray-500">Quatro conteúdos úteis e de relacionamento para cada peça de conversão.</p><div className="mt-4 space-y-3">{calendar.map((item) => <div key={item.day} className="border-b border-gray-100 pb-3 text-xs"><div className="flex flex-wrap gap-x-3 gap-y-1"><span className="font-bold text-gray-800">{item.day}</span><span className="font-semibold text-blue-700">{item.platform}</span><span className="font-semibold text-gray-700">{item.content}</span><span className="rounded-full bg-gray-100 px-2 py-0.5 font-semibold text-gray-600">{item.objective}</span></div><p className="mt-2 text-gray-600"><strong className="text-gray-800">Produto: </strong>{selectedProduct.name}</p><p className="mt-1 text-gray-600">{item.detail}</p><p className="mt-1 font-semibold text-blue-700">CTA: {item.cta}</p></div>)}</div></div>
        <div className="rounded-lg border border-gray-200 bg-white p-5"><h3 className="flex items-center gap-2 font-bold text-gray-900"><BarChart3 className="h-4 w-4 text-blue-600" /> Relatório e próximo teste</h3><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><Metric label="Cliques" value={String(summary.totalClicks)} /><Metric label="Conversões" value={String(summary.totalConversions)} /><Metric label="Taxa de conversão" value={`${summary.conversionRate}%`} /><Metric label="Comissões" value={currency(summary.commissions.total)} /></div><div className="mt-4 rounded-md bg-gray-50 p-3 text-xs leading-relaxed text-gray-600"><strong className="text-gray-800">Teste A/B sugerido:</strong> altere apenas o gancho entre duas peças com o mesmo produto, público e CTA. Compare CTR, conversões, CPA e ROAS quando houver investimento. Sem dados de campanhas conectadas, não há conclusão de desempenho.</div><div className="mt-3 flex items-start gap-2 text-xs text-gray-600"><Target className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />Acompanhe receita, margem, conversão, ticket médio, CTR, CPC, CPA, CAC e ROAS nos canais integrados.</div></div>
      </div>}
    </section>
  );
}

function CampaignField({ title, content, wide = false }: { title: string; content: string; wide?: boolean }) {
  return <div className={`rounded-md bg-gray-50 p-3 ${wide ? 'md:col-span-2' : ''}`}><p className="mb-1 text-[10px] font-bold uppercase text-gray-500">{title}</p><p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">{content}</p></div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-gray-200 p-3"><p className="text-xs text-gray-500">{label}</p><p className="mt-1 font-bold text-gray-900">{value}</p></div>;
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-3"><dt>{label}</dt><dd className="max-w-[58%] text-right font-semibold text-gray-800">{value}</dd></div>;
}