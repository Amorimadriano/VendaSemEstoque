import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const ALLOWED_DOMAINS = [
  'mlstatic.com',
  'aliexpress-media.com',
  'alicdn.com',
  'shopee.com.br',
  'susercontent.com',
  'shopeesz.com',
  'media-amazon.com',
  'images-amazon.com',
  'images.unsplash.com',
];

export async function GET(request: NextRequest) {
  let source = request.nextUrl.searchParams.get('src') || request.nextUrl.searchParams.get('url');
  if (!source) return NextResponse.json({ error: 'Imagem não informada.' }, { status: 400 });

  // Auto-upgrade http to https
  if (source.startsWith('http://')) {
    source = source.replace('http://', 'https://');
  }

  let imageUrl: URL;
  try {
    imageUrl = new URL(source);
  } catch {
    return NextResponse.json({ error: 'URL de imagem inválida.' }, { status: 400 });
  }

  const hostname = imageUrl.hostname.toLowerCase();
  const isAllowed = ALLOWED_DOMAINS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));

  if (!isAllowed) {
    return NextResponse.json({ error: 'Origem de imagem não permitida.' }, { status: 400 });
  }

  try {
    const response = await fetch(imageUrl.toString(), {
      method: 'GET',
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok || !response.body) {
      return NextResponse.json({ error: 'Imagem indisponível.' }, { status: 502 });
    }

    return new NextResponse(response.body, {
      headers: {
        'Content-Type': response.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Falha ao carregar imagem.' }, { status: 502 });
  }
}
