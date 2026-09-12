import { NextRequest, NextResponse } from 'next/server';
import { syncAllActiveAbTestMetrics, syncAbTestMetricsForTest } from '@/services/abTestMetricSync';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    if (body?.testId) {
      const result = await syncAbTestMetricsForTest(body.testId);
      return NextResponse.json(result);
    }

    const summary = await syncAllActiveAbTestMetrics();
    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Falha ao sincronizar métricas dos testes A/B.' },
      { status: 500 }
    );
  }
}
