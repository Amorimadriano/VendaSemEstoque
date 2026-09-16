import { NextRequest, NextResponse } from 'next/server';
import { publishPendingStoriesBatch } from '@/services/batchPublishService';
import { runWithAutomationLog } from '@/services/automationRun';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.AUTOMATION_API_SECRET;
  const authorization = request.headers.get('authorization');

  if (!expectedSecret || authorization !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Automação não autorizada.' }, { status: 401 });
  }

  try {
    const result = await runWithAutomationLog('publish-instagram-stories', () =>
      publishPendingStoriesBatch('instagram')
    );
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Falha na publicação automatizada de Stories no Instagram.' },
      { status: 500 }
    );
  }
}
