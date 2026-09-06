import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'edge';

const contentSchema = z.object({
  productId: z.string().min(1),
  channel: z.enum(['instagram', 'facebook']),
  contentType: z.enum(['REEL', 'STORY', 'POST', 'CAROUSEL']),
  hook: z.string().min(3).max(500),
  caption: z.string().min(3).max(3000),
  script: z.string().max(5000).optional(),
  cta: z.string().min(3).max(500),
});

export async function GET() {
  const { data, error } = await getSupabase().from('marketing_content').select('*, product:products(name)').order('created_at', { ascending: false }).limit(30);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
  const input = contentSchema.safeParse(await request.json());
  if (!input.success) return NextResponse.json({ error: 'Conteúdo inválido.' }, { status: 400 });
  const { data, error } = await getSupabase().from('marketing_content').insert({
    product_id: input.data.productId,
    channel: input.data.channel,
    content_type: input.data.contentType,
    hook: input.data.hook,
    caption: input.data.caption,
    script: input.data.script || null,
    cta: input.data.cta,
  }).select('*, product:products(name)').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const input = z.object({ id: z.string().uuid(), status: z.enum(['DRAFT', 'APPROVED']) }).safeParse(await request.json());
  if (!input.success) return NextResponse.json({ error: 'Atualização inválida.' }, { status: 400 });
  const { data, error } = await getSupabase().from('marketing_content').update({ status: input.data.status, updated_at: new Date().toISOString() }).eq('id', input.data.id).select('*, product:products(name)').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}