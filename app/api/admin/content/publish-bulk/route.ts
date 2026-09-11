import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { publishApprovedFacebookContent, publishApprovedFacebookReelContent } from '@/services/facebookPublisher';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'edge';

const requestSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(50),
});

const delay = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function POST(request: NextRequest) {
  const input = requestSchema.safeParse(await request.json());
  if (!input.success) return NextResponse.json({ error: 'Selecione ao menos um conteúdo válido.' }, { status: 400 });

  const results: Array<{ id: string; published: boolean; error?: string }> = [];
  const postDelay = Math.max(0, Number(process.env.FACEBOOK_POST_DELAY_MS || 600000));

  for (const [index, id] of input.data.ids.entries()) {
    try {
      const { data: content } = await getSupabase().from('marketing_content').select('content_type').eq('id', id).maybeSingle();
      await (content?.content_type === 'REEL' ? publishApprovedFacebookReelContent(id) : publishApprovedFacebookContent(id));
      results.push({ id, published: true });
    } catch (error) {
      results.push({ id, published: false, error: error instanceof Error ? error.message : 'Falha ao publicar.' });
    }

    if (index < input.data.ids.length - 1 && postDelay > 0) await delay(postDelay);
  }

  const published = results.filter((result) => result.published).length;
  return NextResponse.json({ results, published, failed: results.length - published });
}
