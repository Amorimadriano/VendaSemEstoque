import { getSupabase } from '@/lib/supabase';
import { runProductDiscovery } from '@/services/productDiscovery';
import { generateContentDrafts } from '@/services/contentDraftGenerator';
import { publishApprovedFacebookContent } from '@/services/facebookPublisher';

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

  // ETAPA 3: Auto-aprovar os melhores rascunhos de Facebook gerados recentemente
  const publishStats = {
    attempted: 0,
    published: 0,
    failed: 0,
    errors: [] as string[],
  };

  try {
    const { data: pendingDrafts } = await supabase
      .from('marketing_content')
      .select('id, product_id, channel, status')
      .eq('channel', 'facebook')
      .in('status', ['DRAFT', 'APPROVED'])
      .order('created_at', { ascending: false })
      .limit(3);

    if (pendingDrafts && pendingDrafts.length > 0) {
      for (const draft of pendingDrafts) {
        publishStats.attempted += 1;
        try {
          // Garante que o status esteja aprovado antes de publicar
          if (draft.status === 'DRAFT') {
            await supabase
              .from('marketing_content')
              .update({ status: 'APPROVED', updated_at: new Date().toISOString() })
              .eq('id', draft.id);
          }

          await publishApprovedFacebookContent(draft.id);
          publishStats.published += 1;
        } catch (publishErr: any) {
          publishStats.failed += 1;
          const msg = publishErr instanceof Error ? publishErr.message : String(publishErr);
          publishStats.errors.push(`Draft ${draft.id}: ${msg}`);
          console.warn(`[AutonomousAgent] Falha ao publicar post ${draft.id} no Facebook:`, msg);
        }
      }
    }
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    publishStats.errors.push(msg);
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
    drafts: draftResult,
    facebookPublish: publishStats,
  };
}
