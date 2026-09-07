import { NextRequest, NextResponse } from 'next/server';
import { publishApprovedFacebookContent } from '@/services/facebookPublisher';

export const runtime = 'edge';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    return NextResponse.json(await publishApprovedFacebookContent(id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao publicar no Facebook.' }, { status: 500 });
  }
}