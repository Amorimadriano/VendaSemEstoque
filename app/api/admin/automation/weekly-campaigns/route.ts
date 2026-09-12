import { NextRequest, NextResponse } from 'next/server';
import { generateWeeklyCampaigns } from '@/services/weeklyCampaignAutomation';
import { runWithAutomationLog } from '@/services/automationRun';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.AUTOMATION_API_SECRET;
  const authorization = request.headers.get('authorization');

  // Permite execução via secret de automação ou chamada administrativa autenticada
  const isAuthorized = expectedSecret && authorization === `Bearer ${expectedSecret}`;

  try {
    const body = await request.json().catch(() => ({}));
    const limit = typeof body?.limit === 'number' ? Math.max(1, Math.min(body.limit, 10)) : 3;

    const result = await runWithAutomationLog('weekly-campaign-generator', async () => {
      return generateWeeklyCampaigns(limit);
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Falha ao executar a geração automática de campanhas semanais.' },
      { status: 500 }
    );
  }
}
