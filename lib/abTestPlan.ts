export type AbTestPlanInput = {
  name: string;
  price: number;
  commissionPercentage?: number;
  marketplace?: { name?: string } | null;
  brand?: string;
};

export type AbTestPlan = {
  hypothesis: string;
  variationA: string;
  variationB: string;
};

function currency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function generateAbTestPlan(product: AbTestPlanInput, variable: string): AbTestPlan {
  const productName = product.name || 'Produto';
  const brandPrefix = product.brand ? `${product.brand} ` : '';
  const marketName = product.marketplace?.name || 'loja parceira';
  const priceText = currency(product.price);
  const commissionText = product.commissionPercentage ? `${product.commissionPercentage}%` : 'margem ainda não confirmada';

  const templates: Record<string, AbTestPlan> = {
    Gancho: {
      hypothesis: `Um gancho mais específico sobre ${productName} aumenta o CTR e reduz a queda antes do clique, mantendo o mesmo público, oferta e CTA.`,
      variationA: `Antes de comprar ${productName}, veja os detalhes que fazem diferença na decisão.`,
      variationB: `Você está comparando opções de ${productName}? Veja os pontos que valem a pena conferir antes de decidir.`,
    },
    Imagem: {
      hypothesis: `Uma imagem com foco em benefício e contexto de uso gera mais cliques do que uma imagem de catálogo genérica para ${productName}.`,
      variationA: `Imagem de catálogo com ${brandPrefix}${productName} em fundo neutro e foco no produto.`,
      variationB: `Imagem em contexto de uso com ${brandPrefix}${productName}, mostrando benefício e aplicação prática.`,
    },
    Vídeo: {
      hypothesis: `Um vídeo curto mostrando o benefício real de ${productName} aumenta retenção e CTR em comparação ao vídeo institucional.`,
      variationA: `Vídeo 15s com abertura direta e destaque para o problema resolvido por ${productName}.`,
      variationB: `Vídeo 15s com demonstração prática e conclusão para ver mais detalhes na ${marketName}.`,
    },
    Título: {
      hypothesis: `Um título mais direto com benefício específico de ${productName} melhora o CTR e a qualificação do público.`,
      variationA: `${brandPrefix}${productName}: o detalhe que vale conferir antes de comprar.`,
      variationB: `Veja por que ${productName} pode ser uma escolha melhor antes da sua próxima compra.`,
    },
    CTA: {
      hypothesis: `Um CTA mais específico sobre ver detalhes e condições aumenta cliques qualificados para ${productName}.`,
      variationA: `Confira detalhes e condições na ${marketName}.`,
      variationB: `Veja especificações, preço e disponibilidade agora.`,
    },
    Oferta: {
      hypothesis: `Uma oferta com preço e benefício explícitos aumenta conversão para ${productName} sem prejudicar a percepção de valor.`,
      variationA: `Oferta de ${productName} por ${priceText}. Compare condições e disponibilidade na ${marketName}.`,
      variationB: `Preço atual de ${productName}: ${priceText}. Confira comissão estimada de ${commissionText} e condições reais antes de comprar.`,
    },
    Ângulo: {
      hypothesis: `Um ângulo orientado a problema e solução para ${productName} melhora a relevância e o CTR entre o público de pesquisa.`,
      variationA: `Mostre o problema que ${productName} resolve na rotina do cliente.`,
      variationB: `Mostre como ${productName} se compara e entrega valor prático em uso diário.`,
    },
    Formato: {
      hypothesis: `Um formato em vídeo curto ou carrossel com informação útil gera mais cliques do que post estático para ${productName}.`,
      variationA: `Reel vertical de 15s com gancho, benefício e CTA para ${productName}.`,
      variationB: `Carrossel com 5 slides sobre dúvida, benefício, comparação e CTA para ${marketName}.`,
    },
    Público: {
      hypothesis: `Segmentar o público por intenção de compra e uso específico de ${productName} aumenta CTR e taxa de conversão.`,
      variationA: `Público 1: pessoas pesquisando ${productName} para solução prática e comparação de opções.`,
      variationB: `Público 2: pessoas que já avaliaram produtos da categoria e buscam um melhor custo-benefício.`,
    },
  };

  return templates[variable] || templates.Gancho;
}

export function compareAbTestResults(
  variationA: { impressions: number; clicks: number; conversions: number },
  variationB: { impressions: number; clicks: number; conversions: number },
) {
  const ctrA = variationA.impressions > 0 ? (variationA.clicks / variationA.impressions) * 100 : 0;
  const ctrB = variationB.impressions > 0 ? (variationB.clicks / variationB.impressions) * 100 : 0;
  const conversionRateA = variationA.clicks > 0 ? (variationA.conversions / variationA.clicks) * 100 : 0;
  const conversionRateB = variationB.clicks > 0 ? (variationB.conversions / variationB.clicks) * 100 : 0;

  const scoreA = ctrA * 0.55 + conversionRateA * 0.45;
  const scoreB = ctrB * 0.55 + conversionRateB * 0.45;
  const deltaPct = scoreA === 0 && scoreB === 0 ? 0 : ((Math.max(scoreA, scoreB) - Math.min(scoreA, scoreB)) / Math.max(scoreA, scoreB, 1)) * 100;

  const winner = scoreA === scoreB ? 'Empate' : scoreA > scoreB ? 'A' : 'B';
  return {
    winner,
    scoreA,
    scoreB,
    deltaPct,
    ctrA,
    ctrB,
    conversionRateA,
    conversionRateB,
    recommendation:
      winner === 'A'
        ? 'A variação A está melhorando CTR e conversão; mantenha e continue escalando com controle.'
        : winner === 'B'
          ? 'A variação B está vencendo; concentre o próximo ciclo nessa versão e reteste apenas uma variável por vez.'
          : 'Os resultados estão empatados; continue com a variação de menor risco e colete mais volume antes de decidir.',
  };
}
