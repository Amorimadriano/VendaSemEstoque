import { NextRequest, NextResponse } from 'next/server';
import { runProductDiscovery } from '@/services/productDiscovery';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.AUTOMATION_API_SECRET;
  const authorization = request.headers.get('authorization');

  if (!expectedSecret || authorization !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Automação não autorizada.' }, { status: 401 });
  }

  try {
    return NextResponse.json(await runProductDiscovery());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha na sincronização.' }, { status: 500 });
  }
}