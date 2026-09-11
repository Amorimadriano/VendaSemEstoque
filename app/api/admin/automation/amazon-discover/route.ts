import { NextRequest, NextResponse } from 'next/server';
import { runProductDiscovery } from '@/services/productDiscovery';
import { runWithAutomationLog } from '@/services/automationRun';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.AUTOMATION_API_SECRET;
  if (!expectedSecret || request.headers.get('authorization') !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Automação não autorizada.' }, { status: 401 });
  }

  try {
    return NextResponse.json(await runWithAutomationLog('amazon-discovery', () => runProductDiscovery(['amazon'])));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha na sincronização da Amazon.' }, { status: 500 });
  }
}