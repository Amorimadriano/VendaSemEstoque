import { NextRequest, NextResponse } from 'next/server';
import { publishApprovedFacebookContent } from '@/services/facebookPublisher';
import { publishApprovedInstagramContent } from '@/services/instagramPublisher';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'edge';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabase();
    const { data: content, error } = await supabase
      .from('marketing_content')
      .select('channel')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!content) return NextResponse.json({ error: 'Conteúdo não encontrado.' }, { status: 404 });

    if (content.channel === 'instagram') {
      return NextResponse.json(await publishApprovedInstagramContent(id));
    }

    return NextResponse.json(await publishApprovedFacebookContent(id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao publicar conteúdo.' }, { status: 500 });
  }
}