import { NextResponse } from 'next/server';
import { getInstagramPublishingLimit } from '@/services/instagramPublisher';

export const runtime = 'edge';

export async function GET() {
  try {
    const limit = await getInstagramPublishingLimit();
    const reserve = Math.max(1, Number(process.env.INSTAGRAM_QUOTA_RESERVE || 5));
    return NextResponse.json({ ...limit, reserve, canPublish: limit.remaining > reserve });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao consultar cota do Instagram.' }, { status: 502 });
  }
}
