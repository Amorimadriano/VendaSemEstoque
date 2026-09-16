import { getSupabase } from '@/lib/supabase';
import { runProductDiscovery } from '@/services/productDiscovery';
import { generateContentDraftForProduct, generateContentDrafts } from '@/services/contentDraftGenerator';
import { publishApprovedFacebookContent } from '@/services/facebookPublisher';
import { publishApprovedInstagramContent } from '@/services/instagramPublisher';
import { nextRetryAt } from '@/services/automationRun';
import { syncAllActiveAbTestMetrics } from '@/services/abTestMetricSync';

export interface AutonomousWorkflowResult {
  startedAt: string;
  finishedAt: string;
  sync: {
    marketplaces: string[];
    discovered: number;
    published: number;
    logs: any[];
  };
  abTestSync?: {
    testsChecked: number;
    testsUpdated: number;
    winnersFound: number;
  };
  drafts: {
    candidates: number;
    draftsCreated: number;
  };
  facebookPublish: {
    attempted: number;
    published: number;
    failed: number;
    errors: string[];
  };
  instagramPublish: {
    attempted: number;
    published: number;
    failed: number;
    errors: string[];
  };
}

async function wait(milliseconds: number) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function publishDailyChannel(channel: 'facebook' | 'instagram') {
  const supabase = getSupabase();
  const stats = { attempted: 0, published: 0, failed: 0, errors: [] as string[] };
  const { data: published, error: publishedError } = await supabase
    .from('marketing_content')
    .select('product_id')
    .eq('channel', channel)
    .eq('status', 'PUBLISHED');
  if (publishedError) throw publishedError;
  const publishedProductIds = new Set((published || []).map((item) => item.product_id));

  const { data: pending, error } = await supabase
    .from('marketing_content')
    .select('id, product_id, status, content_type, attempt_count, next_retry_at')
    .eq('channel', channel)
    .in('status', ['DRAFT', 'APPROVED'])
    .order('created_at', { ascending: true })
    .limit(50);
  if (error) throw error;

  const now = Date.now();
  let content = (pending || []).find((item) => !publishedProductIds.has(item.product_id) && (!item.next_retry_at || new Date(item.next_retry_at).getTime() <= now));
  if (!content) {
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id')
      .eq('status', 'ACTIVE')
      .order('popularity_score', { ascending: false })
      .limit(100);
    if (productsError) throw productsError;
    const product = (products || []).find((item) => !publishedProductIds.has(item.id));
    if (product) content = await generateContentDraftForProduct(product.id, channel, 'POST');
  }
  if (!content) return stats;
  stats.attempted = 1;

  try {
    const { error: lockError } = await supabase.from('marketing_content').update({ processing_started_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', content.id);
    if (lockError) throw lockError;
    if (content.status === 'DRAFT') {
      const { error: approvalError } = await supabase
        .from('marketing_content')
        .update({ status: 'APPROVED', publication_error: null, updated_at: new Date().toISOString() })
        .eq('id', content.id);
      if (approvalError) throw approvalError;
    }

    if (channel === 'instagram' && content.content_type === 'REEL') {
      // FFmpeg local não é suportado no runtime edge (Cloudflare Workers); usa sempre o fallback para POST com imagem.
      await supabase
        .from('marketing_content')
        .update({ content_type: 'POST', updated_at: new Date().toISOString() })
        .eq('id', content.id);
    }

    if (channel === 'facebook') await publishApprovedFacebookContent(content.id);
    else await publishApprovedInstagramContent(content.id);
    stats.published = 1;
  } catch (publishError) {
    stats.failed = 1;
    const message = publishError instanceof Error ? publishError.message : String(publishError);
    stats.errors.push(`Content ${content.id}: ${message}`);
    const attempts = Number(content.attempt_count || 0) + 1;
    await supabase.from('marketing_content').update({
      attempt_count: attempts,
      next_retry_at: nextRetryAt(attempts),
      processing_started_at: null,
      publication_error: message,
      updated_at: new Date().toISOString(),
    }).eq('id', content.id);
  }
  return stats;
}

export async function runAutonomousMarketplaceAndPublishWorkflow(): Promise<AutonomousWorkflowResult> {
  const startedAt = new Date().toISOString();
  const supabase = getSupabase();

  // ETAPA 1: Sincronizar marketplaces comerciais; Amazon possui rotina diária dedicada.
  let syncResult: any = { marketplaces: [], discovered: 0, published: 0, logs: [] };
  try {
    syncResult = await runProductDiscovery(['mercadolivre', 'aliexpress', 'shopee']);
  } catch (err) {
    console.warn('[AutonomousAgent] Sincronização de catálogo gerou aviso:', err);
  }

  // ETAPA 1.5: Sincronizar métricas reais dos testes A/B ativos
  let abTestSyncResult = { testsChecked: 0, testsUpdated: 0, winnersFound: 0 };
  try {
    const abSync = await syncAllActiveAbTestMetrics();
    abTestSyncResult = {
      testsChecked: abSync.testsChecked,
      testsUpdated: abSync.testsUpdated,
      winnersFound: abSync.winnersFound,
    };
  } catch (err) {
    console.warn('[AutonomousAgent] Sincronização de testes A/B gerou aviso:', err);
  }

  // ETAPA 2: Gerar rascunhos de conteúdo otimizados para os produtos com melhor pontuação
  let draftResult: any = { candidates: 0, draftsCreated: 0 };
  try {
    draftResult = await generateContentDrafts();
  } catch (err) {
    console.warn('[AutonomousAgent] Geração de rascunhos gerou aviso:', err);
  }

  // ETAPA 3: Tentar publicar diariamente em cada canal de forma independente.
  let facebookPublish = { attempted: 0, published: 0, failed: 0, errors: [] as string[] };
  try {
    if (!process.env.META_FACEBOOK_PAGE_ID) throw new Error('META_FACEBOOK_PAGE_ID não configurado.');
    facebookPublish = await publishDailyChannel('facebook');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    facebookPublish = { attempted: 1, published: 0, failed: 1, errors: [message] };
    console.warn('[AutonomousAgent] Publicação Facebook falhou:', message);
  }

  let instagramPublish = { attempted: 0, published: 0, failed: 0, errors: [] as string[] };
  try {
    instagramPublish = await publishDailyChannel('instagram');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    instagramPublish = { attempted: 1, published: 0, failed: 1, errors: [message] };
    console.warn('[AutonomousAgent] Publicação Instagram falhou:', message);
  }

  const finishedAt = new Date().toISOString();

  return {
    startedAt,
    finishedAt,
    sync: {
      marketplaces: syncResult.marketplaces || [],
      discovered: syncResult.discovered || 0,
      published: syncResult.published || 0,
      logs: syncResult.logs || [],
    },
    abTestSync: abTestSyncResult,
    drafts: draftResult,
    facebookPublish,
    instagramPublish,
  };
}
