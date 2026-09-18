import { NextRequest, NextResponse } from 'next/server';
import { runProductPartnerVerifierAgent } from '@/services/productPartnerVerifierAgent';
import { runWithAutomationLog } from '@/services/automationRun';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.AUTOMATION_API_SECRET;
  const authorization = request.headers.get('authorization');

  if (!expectedSecret || authorization !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Automação não autorizada.' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({})) as { batchSize?: number; marketplaceSlug?: string };
    const result = await runWithAutomationLog('verify-partner-products', () =>
      runProductPartnerVerifierAgent({
        batchSize: body.batchSize || 100,
        marketplaceSlug: body.marketplaceSlug,
      })
    );
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Falha na execução do agente de verificação de produtos parceiros.' },
      { status: 500 }
    );
  }
}
