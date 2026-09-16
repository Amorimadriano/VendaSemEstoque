import { getSupabase } from '@/lib/supabase';
import { generateContentDraftForProduct } from '@/services/contentDraftGenerator';
import {
  publishApprovedInstagramContent,
  publishApprovedInstagramStory,
} from '@/services/instagramPublisher';
import {
  publishApprovedFacebookContent,
  publishApprovedFacebookStory,
} from '@/services/facebookPublisher';

export interface BatchPublishItemResult {
  productId: string;
  productName: string;
  contentId?: string;
  published: boolean;
  externalPostId?: string;
  error?: string;
}

export interface BatchPublishResult {
  channel: 'instagram' | 'facebook';
  totalActive: number;
  totalPublishedPreviously: number;
  pendingCount: number;
  attempted: number;
  published: number;
  failed: number;
  results: BatchPublishItemResult[];
}

export async function publishPendingChannelBatch(
  channel: 'instagram' | 'facebook',
  options?: {
    maxItems?: number;
    delayMs?: number;
  }
): Promise<BatchPublishResult> {
  const supabase = getSupabase();
  const maxItems = Math.max(1, Math.min(options?.maxItems ?? Number(process.env.AUTO_PUBLISH_BATCH_SIZE || 5), 50));
  const delayMs = options?.delayMs ?? 1500;

  const stats: BatchPublishResult = {
    channel,
    totalActive: 0,
    totalPublishedPreviously: 0,
    pendingCount: 0,
    attempted: 0,
    published: 0,
    failed: 0,
    results: [],
  };

  // 1. Produtos ativos
  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id, name, image_url, marketplace:marketplaces(name, slug)')
    .eq('status', 'ACTIVE')
    .order('popularity_score', { ascending: false });

  if (prodErr) throw prodErr;
  stats.totalActive = products?.length || 0;

  // 2. Produtos já publicados no canal
  const { data: publishedContents, error: pubErr } = await supabase
    .from('marketing_content')
    .select('product_id')
    .eq('channel', channel)
    .eq('status', 'PUBLISHED');

  if (pubErr) throw pubErr;
  const publishedProductIds = new Set((publishedContents || []).map((c) => c.product_id));
  stats.totalPublishedPreviously = publishedProductIds.size;

  // 3. Pendentes para publicação
  const pendingProducts = (products || []).filter((p) => !publishedProductIds.has(p.id));
  stats.pendingCount = pendingProducts.length;

  const batch = pendingProducts.slice(0, maxItems);

  for (let i = 0; i < batch.length; i += 1) {
    const product = batch[i];
    stats.attempted += 1;

    try {
      let { data: draft } = await supabase
        .from('marketing_content')
        .select('id, status, content_type')
        .eq('product_id', product.id)
        .eq('channel', channel)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!draft) {
        draft = await generateContentDraftForProduct(product.id, channel, 'POST');
      }

      if (!draft?.id) {
        throw new Error(`Não foi possível obter ou criar rascunho para ${product.name}`);
      }

      if (draft.status !== 'APPROVED') {
        const { error: appErr } = await supabase
          .from('marketing_content')
          .update({ status: 'APPROVED', updated_at: new Date().toISOString() })
          .eq('id', draft.id);
        if (appErr) throw appErr;
      }

      let publishResult: { published: boolean; externalPostId?: string };
      if (channel === 'instagram') {
        publishResult = await publishApprovedInstagramContent(draft.id);
      } else {
        publishResult = await publishApprovedFacebookContent(draft.id);
      }

      stats.published += 1;
      stats.results.push({
        productId: product.id,
        productName: product.name,
        contentId: draft.id,
        published: true,
        externalPostId: publishResult.externalPostId,
      });

      if (i < batch.length - 1 && delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    } catch (err) {
      stats.failed += 1;
      const message = err instanceof Error ? err.message : String(err);
      stats.results.push({
        productId: product.id,
        productName: product.name,
        published: false,
        error: message,
      });

      // Interrompe em caso de restrição de limite da Meta para poupar cota
      if (/limit|rate|quota|spam|frequency|permissão|permission/i.test(message)) {
        console.warn(`[BatchPublisher] Interrompendo lote de ${channel} por restrição de limite/permissão: ${message}`);
        break;
      }
    }
  }

  return stats;
}

export async function publishPendingStoriesBatch(
  channel: 'instagram' | 'facebook',
  options?: {
    maxItems?: number;
    delayMs?: number;
  }
): Promise<BatchPublishResult> {
  const supabase = getSupabase();
  const maxItems = Math.max(1, Math.min(options?.maxItems ?? Number(process.env.AUTO_PUBLISH_STORIES_BATCH_SIZE || 7), 50));
  const delayMs = options?.delayMs ?? 1500;

  const stats: BatchPublishResult = {
    channel,
    totalActive: 0,
    totalPublishedPreviously: 0,
    pendingCount: 0,
    attempted: 0,
    published: 0,
    failed: 0,
    results: [],
  };

  // 1. Produtos ativos com imagem válida
  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id, name, image_url, marketplace:marketplaces(name, slug)')
    .eq('status', 'ACTIVE')
    .not('image_url', 'is', null)
    .order('popularity_score', { ascending: false });

  if (prodErr) throw prodErr;
  stats.totalActive = products?.length || 0;

  // 2. Produtos já com Story publicado no canal
  const { data: publishedContents, error: pubErr } = await supabase
    .from('marketing_content')
    .select('product_id')
    .eq('channel', channel)
    .eq('content_type', 'STORY')
    .eq('status', 'PUBLISHED');

  if (pubErr) throw pubErr;
  const publishedProductIds = new Set((publishedContents || []).map((c) => c.product_id));
  stats.totalPublishedPreviously = publishedProductIds.size;

  // 3. Pendentes para Story
  const pendingProducts = (products || []).filter((p) => !publishedProductIds.has(p.id));
  stats.pendingCount = pendingProducts.length;

  const batch = pendingProducts.slice(0, maxItems);

  for (let i = 0; i < batch.length; i += 1) {
    const product = batch[i];
    stats.attempted += 1;

    try {
      let { data: draft } = await supabase
        .from('marketing_content')
        .select('id, status, content_type')
        .eq('product_id', product.id)
        .eq('channel', channel)
        .eq('content_type', 'STORY')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!draft) {
        draft = await generateContentDraftForProduct(product.id, channel, 'STORY');
      }

      if (!draft?.id) {
        throw new Error(`Não foi possível obter ou criar rascunho de Story para ${product.name}`);
      }

      if (draft.status !== 'APPROVED') {
        const { error: appErr } = await supabase
          .from('marketing_content')
          .update({ status: 'APPROVED', updated_at: new Date().toISOString() })
          .eq('id', draft.id);
        if (appErr) throw appErr;
      }

      let publishResult: { published: boolean; externalPostId?: string };
      if (channel === 'instagram') {
        publishResult = await publishApprovedInstagramStory(draft.id);
      } else {
        publishResult = await publishApprovedFacebookStory(draft.id);
      }

      stats.published += 1;
      stats.results.push({
        productId: product.id,
        productName: product.name,
        contentId: draft.id,
        published: true,
        externalPostId: publishResult.externalPostId,
      });

      if (i < batch.length - 1 && delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    } catch (err) {
      stats.failed += 1;
      const message = err instanceof Error ? err.message : String(err);
      stats.results.push({
        productId: product.id,
        productName: product.name,
        published: false,
        error: message,
      });

      if (/limit|rate|quota|spam|frequency|permissão|permission/i.test(message)) {
        console.warn(`[BatchStoriesPublisher] Interrompendo lote de Stories de ${channel} por restrição de limite/permissão: ${message}`);
        break;
      }
    }
  }

  return stats;
}
