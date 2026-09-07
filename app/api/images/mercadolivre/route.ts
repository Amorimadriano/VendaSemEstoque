import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get('src');
  if (!source) return NextResponse.json({ error: 'Imagem não informada.' }, { status: 400 });

  let imageUrl: URL;
  try {
    imageUrl = new URL(source);
  } catch {
    return NextResponse.json({ error: 'URL de imagem inválida.' }, { status: 400 });
  }

  if (imageUrl.protocol !== 'https:' || !imageUrl.hostname.endsWith('mlstatic.com')) {
    return NextResponse.json({ error: 'Origem de imagem não permitida.' }, { status: 400 });
  }

  const response = await fetch(imageUrl, { headers: { Accept: 'image/avif,image/webp,image/*,*/*;q=0.8' } });
  if (!response.ok || !response.body) return NextResponse.json({ error: 'Imagem indisponível.' }, { status: 502 });

  return new NextResponse(response.body, {
    headers: {
      'Content-Type': response.headers.get('content-type') || 'image/webp',
      'Cache-Control': 'public, max-age=86400, s-maxage=604800',
    },
  });
}