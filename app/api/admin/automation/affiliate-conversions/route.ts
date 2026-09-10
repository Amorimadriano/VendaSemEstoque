import { NextRequest, NextResponse } from 'next/server';
import { syncAffiliateConversions } from '@/services/affiliateConversionSync';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.AUTOMATION_API_SECRET;
  if (!expectedSecret || request.headers.get('authorization') !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Automação não autorizada.' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({})) as { startDate?: string; endDate?: string };
    const startDate = body.startDate ? new Date(body.startDate) : undefined;
    const endDate = body.endDate ? new Date(body.endDate) : undefined;
    if ((startDate && Number.isNaN(startDate.getTime())) || (endDate && Number.isNaN(endDate.getTime()))) {
      return NextResponse.json({ error: 'Período inválido.' }, { status: 400 });
    }
    return NextResponse.json(await syncAffiliateConversions(startDate, endDate));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao importar conversões afiliadas.' }, { status: 500 });
  }
}
