import { NextRequest, NextResponse } from 'next/server';
import { generateContentDrafts } from '@/services/contentDraftGenerator';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.AUTOMATION_API_SECRET;
  if (!expectedSecret || request.headers.get('authorization') !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Automação não autorizada.' }, { status: 401 });
  }
  try {
    return NextResponse.json(await generateContentDrafts());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao gerar rascunhos.' }, { status: 500 });
  }
}