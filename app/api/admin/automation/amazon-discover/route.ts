import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.AUTOMATION_API_SECRET;
  if (!expectedSecret || request.headers.get('authorization') !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Automação não autorizada.' }, { status: 401 });
  }

  return NextResponse.json({ error: 'A sincronização da Amazon foi desativada. Use a descoberta de AliExpress e Shopee.' }, { status: 410 });
}