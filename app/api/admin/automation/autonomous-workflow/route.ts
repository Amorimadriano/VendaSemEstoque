import { NextRequest, NextResponse } from 'next/server';
import { runAutonomousMarketplaceAndPublishWorkflow } from '@/services/autonomousWorkflowAgent';
import { runWithAutomationLog } from '@/services/automationRun';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.AUTOMATION_API_SECRET;
  const authorization = request.headers.get('authorization');

  if (!expectedSecret || authorization !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Automação não autorizada.' }, { status: 401 });
  }

  try {
    const result = await runWithAutomationLog('autonomous-workflow', runAutonomousMarketplaceAndPublishWorkflow);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Falha na execução do agente autônomo.' },
      { status: 500 }
    );
  }
}
