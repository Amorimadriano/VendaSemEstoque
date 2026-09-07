import { NextResponse } from 'next/server';
import { generateContentDrafts } from '@/services/contentDraftGenerator';

export const runtime = 'edge';

export async function POST() {
  try {
    return NextResponse.json(await generateContentDrafts());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao gerar rascunhos.' }, { status: 500 });
  }
}