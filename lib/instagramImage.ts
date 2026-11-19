export class InstagramImageError extends Error {}

export async function validateInstagramImage(
  source: string,
  fetcher: typeof fetch = fetch,
): Promise<string> {
  const url = new URL(source);
  if (url.protocol !== 'https:') {
    throw new InstagramImageError('A imagem do Instagram precisa de uma URL HTTPS pública.');
  }
  if (url.hostname === 'images.unsplash.com') {
    url.searchParams.delete('auto');
    url.searchParams.set('fm', 'jpg');
  }

  const response = await fetcher(url, {
    headers: { Accept: 'image/jpeg' },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    const message = `Imagem do Instagram indisponível (HTTP ${response.status}).`;
    if (response.status === 404 || response.status === 410) throw new InstagramImageError(message);
    throw new Error(message);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length < 3 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
    throw new InstagramImageError('A URL da imagem do Instagram não retornou uma foto JPEG válida.');
  }
  if (bytes.length > 8 * 1024 * 1024) {
    throw new InstagramImageError('A imagem do Instagram excede o limite de 8 MB.');
  }
  return url.toString();
}
