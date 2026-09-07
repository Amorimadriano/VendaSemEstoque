import { NextRequest, NextResponse } from 'next/server';
import { generateContentDraftForProduct, generateContentDrafts } from '@/services/contentDraftGenerator';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null) as { productId?: string; channel?: 'instagram' | 'facebook'; contentType?: string } | null;
    if (body?.productId && body.channel && body.contentType) {
      return NextResponse.json(await generateContentDraftForProduct(body.productId, body.channel, body.contentType), { status: 201 });
    }
    return NextResponse.json(await generateContentDrafts());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao gerar rascunhos.' }, { status: 500 });
  }
}