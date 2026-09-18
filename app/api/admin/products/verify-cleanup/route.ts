import { NextRequest, NextResponse } from 'next/server';
import { runProductPartnerVerifierAgent } from '@/services/productPartnerVerifierAgent';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as { batchSize?: number; marketplaceSlug?: string };
    const result = await runProductPartnerVerifierAgent({
      batchSize: body.batchSize || 100,
      marketplaceSlug: body.marketplaceSlug,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Falha na verificação e limpeza de produtos.' },
      { status: 500 }
    );
  }
}
