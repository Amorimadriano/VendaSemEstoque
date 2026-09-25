const ALLOWED_HOSTS = new Set(['s.shopee.com.br', 'shopee.com.br', 'www.shopee.com.br', 'shope.ee']);
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export type ShopeeProductMetadata = {
  affiliateUrl: string;
  productUrl: string;
  externalProductId: string;
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  oldPrice?: number;
  commissionPercentage?: number;
};

export type ShopeeApiProduct = Omit<ShopeeProductMetadata, 'affiliateUrl'>;
export type ShopeeProductLookup = (externalProductId: string) => Promise<ShopeeApiProduct | null>;

function isAllowedShopeeUrl(value: URL) {
  return value.protocol === 'https:' && ALLOWED_HOSTS.has(value.hostname.toLowerCase());
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#x([\da-f]{1,6});/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)));
}

function readAttributes(tag: string) {
  const attributes = new Map<string, string>();
  const pattern = /([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(tag))) {
    attributes.set(match[1].toLowerCase(), decodeHtml(match[2] ?? match[3] ?? match[4] ?? ''));
  }

  return attributes;
}

function parsePrice(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : undefined;
  if (typeof value !== 'string') return undefined;

  const normalized = value.replace(/[^\d.,-]/g, '').trim();
  const decimal = normalized.includes(',')
    ? normalized.replace(/\./g, '').replace(',', '.')
    : normalized;
  const price = Number(decimal);
  return Number.isFinite(price) && price > 0 ? price : undefined;
}

function findProduct(value: unknown): Record<string, unknown> | undefined {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = findProduct(entry);
      if (found) return found;
    }
    return undefined;
  }
  if (!value || typeof value !== 'object') return undefined;

  const object = value as Record<string, unknown>;
  const types = Array.isArray(object['@type']) ? object['@type'] : [object['@type']];
  if (types.some((type) => String(type).toLowerCase() === 'product')) return object;

  for (const child of Object.values(object)) {
    const found = findProduct(child);
    if (found) return found;
  }
  return undefined;
}

function getJsonLdProduct(html: string) {
  const scripts = html.match(/<script\b[^>]*type\s*=\s*['"]application\/ld\+json['"][^>]*>[\s\S]*?<\/script>/gi) || [];
  for (const script of scripts) {
    const json = script.replace(/^<script\b[^>]*>/i, '').replace(/<\/script>$/i, '').trim();
    try {
      const product = findProduct(JSON.parse(decodeHtml(json)));
      if (product) return product;
    } catch {
      continue;
    }
  }
  return undefined;
}

function getExternalProductId(productUrl: string) {
  const productPath = new URL(productUrl).pathname;
  return productPath.match(/\/product\/\d+\/(\d+)/i)?.[1] || productPath.match(/\/i\.\d+\.(\d+)/i)?.[1];
}

export async function parseShopeeProductPage(html: string, productUrl: string, affiliateUrl: string): Promise<ShopeeProductMetadata> {
  const metadata = new Map<string, string>();
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const attributes = readAttributes(tag);
    const key = attributes.get('property') || attributes.get('name') || attributes.get('itemprop');
    const content = attributes.get('content');
    if (key && content) metadata.set(key.toLowerCase(), content);
  }

  const product = getJsonLdProduct(html);
  const offers = Array.isArray(product?.offers) ? product.offers[0] : product?.offers;
  const offer = offers && typeof offers === 'object' ? offers as Record<string, unknown> : undefined;
  const nameValue = product?.name || metadata.get('og:title') || metadata.get('twitter:title');
  const name = decodeHtml(String(nameValue || '')).replace(/\s*\|\s*Shopee Brasil\s*$/i, '').trim();
  const productImage = Array.isArray(product?.image) ? product.image[0] : product?.image;
  const imageUrl = String(productImage || metadata.get('og:image') || metadata.get('twitter:image') || '').trim();
  const description = decodeHtml(String(product?.description || metadata.get('og:description') || metadata.get('description') || name)).trim();
  const price = parsePrice(metadata.get('product:price:amount') || metadata.get('og:price:amount') || offer?.price || offer?.lowPrice);
  const oldPrice = parsePrice(metadata.get('product:price:original_amount') || metadata.get('og:price:original_amount'));

  if (name.length < 5 || !imageUrl.startsWith('https://') || !price) {
    throw new Error('A página da Shopee não forneceu nome, imagem HTTPS e preço verificáveis.');
  }

  let externalProductId = getExternalProductId(productUrl);
  if (!externalProductId) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(productUrl));
    externalProductId = Array.from(new Uint8Array(digest)).slice(0, 12).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  return {
    affiliateUrl,
    productUrl,
    externalProductId,
    name,
    description,
    imageUrl,
    price,
    oldPrice,
  };
}

export async function resolveShopeeAffiliateUrl(
  affiliateUrl: string,
  lookupProduct?: ShopeeProductLookup,
  fetcher: typeof fetch = fetch,
): Promise<ShopeeProductMetadata> {
  let currentUrl: URL;
  try {
    currentUrl = new URL(affiliateUrl);
  } catch {
    throw new Error('Link inválido.');
  }
  if (!isAllowedShopeeUrl(currentUrl)) throw new Error('Informe um link HTTPS de afiliado Shopee.');

  let response: Response | undefined;
  for (let redirectCount = 0; redirectCount <= 5; redirectCount += 1) {
    response = await fetcher(currentUrl, {
      redirect: 'manual',
      headers: { Accept: 'text/html,application/xhtml+xml', 'User-Agent': 'Mozilla/5.0 (compatible; VendaSemEstoque/1.0)' },
    });
    if (!REDIRECT_STATUSES.has(response.status)) break;

    const location = response.headers.get('location');
    if (!location || redirectCount === 5) throw new Error('Redirecionamento da Shopee inválido ou excedeu o limite.');
    currentUrl = new URL(location, currentUrl);
    if (!isAllowedShopeeUrl(currentUrl)) throw new Error('O link redirecionou para fora dos domínios Shopee permitidos.');
  }

  if (!response?.ok) throw new Error(`A Shopee respondeu com HTTP ${response?.status || 'desconhecido'}.`);
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) throw new Error('O destino do link não retornou uma página de produto HTML.');

  const html = await response.text();
  if (html.length > 5_000_000) throw new Error('A página retornada pela Shopee excedeu o limite de leitura.');
  try {
    return await parseShopeeProductPage(html, currentUrl.toString(), affiliateUrl);
  } catch (pageError) {
    const externalProductId = getExternalProductId(currentUrl.toString());
    if (!externalProductId || !lookupProduct) throw pageError;

    try {
      const product = await lookupProduct(externalProductId);
      if (
        product?.externalProductId === externalProductId &&
        product.name.length >= 5 &&
        product.imageUrl.startsWith('https://') &&
        Number.isFinite(product.price) &&
        product.price > 0
      ) {
        return { ...product, affiliateUrl };
      }
      throw new Error('A API oficial não confirmou o mesmo ID de produto.');
    } catch (apiError) {
      const apiMessage = apiError instanceof Error ? apiError.message : 'Falha na consulta oficial.';
      const pageMessage = pageError instanceof Error ? pageError.message : 'Metadados públicos indisponíveis.';
      throw new Error(`${pageMessage} Consulta oficial: ${apiMessage}`);
    }
  }
}