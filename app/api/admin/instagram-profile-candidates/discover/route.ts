import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, verifyAdminSession } from '@/lib/adminAuth';
import { mapInstagramHashtagMedia, normalizeInstagramHashtag } from '@/lib/instagramProfileCandidate';

export const runtime = 'edge';

type MetaGraphResponse = {
  id?: string;
  data?: unknown;
  error?: { message?: string };
};

async function getGraphData(url: URL, token: string): Promise<MetaGraphResponse> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const result = await response.json().catch(() => ({})) as MetaGraphResponse;
  if (!response.ok) throw new Error(result.error?.message || `Meta Graph API retornou HTTP ${response.status}.`);
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request.cookies.get(COOKIE_NAME)?.value);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  } catch {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as { hashtag?: unknown } | null;
  if (typeof body?.hashtag !== 'string') {
    return NextResponse.json({ error: 'Informe uma hashtag para pesquisar.' }, { status: 400 });
  }

  const hashtag = normalizeInstagramHashtag(body.hashtag);
  if (!hashtag) {
    return NextResponse.json({ error: 'Use uma hashtag de até 30 letras, números ou sublinhados.' }, { status: 400 });
  }

  const accessToken = process.env.META_ACCESS_TOKEN;
  const instagramAccountId = process.env.META_INSTAGRAM_ACCOUNT_ID;
  if (!accessToken || !instagramAccountId) {
    return NextResponse.json({ error: 'Configure META_ACCESS_TOKEN e META_INSTAGRAM_ACCOUNT_ID no ambiente do servidor.' }, { status: 503 });
  }

  try {
    const searchUrl = new URL('https://graph.facebook.com/v26.0/ig_hashtag_search');
    searchUrl.searchParams.set('user_id', instagramAccountId);
    searchUrl.searchParams.set('q', hashtag);
    const hashtagSearch = await getGraphData(searchUrl, accessToken);
    const hashtagRecord = Array.isArray(hashtagSearch.data) ? hashtagSearch.data[0] as { id?: string } | undefined : undefined;
    const hashtagId = hashtagRecord?.id;
    if (!hashtagId) return NextResponse.json({ hashtag, profiles: [] });

    const mediaUrl = new URL(`https://graph.facebook.com/v26.0/${encodeURIComponent(hashtagId)}/recent_media`);
    mediaUrl.searchParams.set('user_id', instagramAccountId);
    mediaUrl.searchParams.set('fields', 'username,permalink,timestamp');
    mediaUrl.searchParams.set('limit', '50');
    const recentMedia = await getGraphData(mediaUrl, accessToken);
    const profiles = mapInstagramHashtagMedia(recentMedia.data);

    return NextResponse.json({ hashtag, profiles });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao consultar a Meta Graph API.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}