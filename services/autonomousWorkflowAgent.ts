import { getSupabase } from '@/lib/supabase';
import { runProductDiscovery } from '@/services/productDiscovery';
import { generateContentDrafts } from '@/services/contentDraftGenerator';
import { publishApprovedFacebookContent } from '@/services/facebookPublisher';
import { publishApprovedInstagramContent } from '@/services/instagramPublisher';
import { createCreatomateVideo, refreshCreatomateVideo } from '@/services/creatomateVideo';

export interface AutonomousWorkflowResult {
  startedAt: string;
  finishedAt: string;
  sync: {
    marketplaces: string[];
    discovered: number;
    published: number;
    logs: any[];
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
  const { data: pending, error } = await supabase
    .from('marketing_content')
    .select('id, status, content_type')
    .eq('channel', channel)
    .in('status', ['DRAFT', 'APPROVED'])
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) throw error;

  const content = pending?.[0];
  if (!content) return stats;
  stats.attempted = 1;

  try {
    if (content.status === 'DRAFT') {
      const { error: approvalError } = await supabase
        .from('marketing_content')
        .update({ status: 'APPROVED', updated_at: new Date().toISOString() })
        .eq('id', content.id);
      if (approvalError) throw approvalError;
    }

    if (channel === 'instagram' && content.content_type === 'REEL') {
      await createCreatomateVideo(content.id);
      let ready = false;
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const render = await refreshCreatomateVideo(content.id);
        if (render.status.toUpperCase() === 'SUCCEEDED' && render.videoUrl) {
          ready = true;
          break;
        }
        if (render.status.toLowerCase() === 'failed') throw new Error('Render do Reel falhou.');
        await wait(5000);
      }
      if (!ready) throw new Error('Render do Reel não ficou pronto no tempo esperado.');
    }

    if (channel === 'facebook') await publishApprovedFacebookContent(content.id);
    else await publishApprovedInstagramContent(content.id);
    stats.published = 1;
  } catch (publishError) {
    stats.failed = 1;
    stats.errors.push(`Content ${content.id}: ${publishError instanceof Error ? publishError.message : String(publishError)}`);
  }
  return stats;
}

export async function runAutonomousMarketplaceAndPublishWorkflow(): Promise<AutonomousWorkflowResult> {
  const startedAt = new Date().toISOString();
  const supabase = getSupabase();

  // ETAPA 1: Sincronizar todos os marketplaces (Mercado Livre, AliExpress, Shopee)
  let syncResult: any = { marketplaces: [], discovered: 0, published: 0, logs: [] };
  try {
    syncResult = await runProductDiscovery();
  } catch (err) {
    console.warn('[AutonomousAgent] Sincronização de catálogo gerou aviso:', err);
  }

  // ETAPA 2: Gerar rascunhos de conteúdo otimizados para os produtos com melhor pontuação
  let draftResult: any = { candidates: 0, draftsCreated: 0 };
  try {
    draftResult = await generateContentDrafts();
  } catch (err) {
    console.warn('[AutonomousAgent] Geração de rascunhos gerou aviso:', err);
  }

  // ETAPA 3: Aprovar e publicar no máximo um conteúdo por canal diariamente.
  const publishStats = await publishDailyChannel('facebook');
  const instagramPublish = await publishDailyChannel('instagram');

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
    drafts: draftResult,
    facebookPublish: publishStats,
    instagramPublish,
  };
}
