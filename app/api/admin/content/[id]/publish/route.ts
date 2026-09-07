import { NextRequest, NextResponse } from 'next/server';
import { publishApprovedFacebookContent } from '@/services/facebookPublisher';

export const runtime = 'edge';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const expectedSecret = process.env.AUTOMATION_API_SECRET;
  if (!expectedSecret || request.headers.get('authorization') !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Publicação não autorizada.' }, { status: 401 });
  }
  try {
    const { id } = await params;
    return NextResponse.json(await publishApprovedFacebookContent(id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao publicar no Facebook.' }, { status: 500 });
  }
}