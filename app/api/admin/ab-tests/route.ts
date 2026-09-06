import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'edge';

const abTestSchema = z.object({
  productId: z.string().min(1),
  variable: z.enum(['Gancho', 'Imagem', 'Vídeo', 'Título', 'CTA', 'Oferta', 'Ângulo', 'Formato', 'Público']),
  hypothesis: z.string().min(5).max(500),
  variationA: z.string().min(3).max(1000),
  variationB: z.string().min(3).max(1000),
});

export async function GET() {
  const { data, error } = await getSupabase().from('marketing_ab_tests').select('*').order('created_at', { ascending: false }).limit(20);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request: Request) {
  const input = abTestSchema.safeParse(await request.json());
  if (!input.success) return NextResponse.json({ error: 'Dados do teste inválidos.' }, { status: 400 });

  const { data, error } = await getSupabase().from('marketing_ab_tests').insert({
    product_id: input.data.productId,
    variable: input.data.variable,
    hypothesis: input.data.hypothesis,
    variation_a: input.data.variationA,
    variation_b: input.data.variationB,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}