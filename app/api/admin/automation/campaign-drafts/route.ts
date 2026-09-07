import { NextRequest, NextResponse } from 'next/server';
import { generateCampaignDrafts } from '@/services/campaignDraftGenerator';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  if (!process.env.AUTOMATION_API_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.AUTOMATION_API_SECRET}`) return NextResponse.json({ error: 'Automação não autorizada.' }, { status: 401 });
  try {
    return NextResponse.json(await generateCampaignDrafts());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao gerar campanhas.' }, { status: 500 });
  }
}