import test from 'node:test';
import assert from 'node:assert/strict';
import { parseShopeeProductPage, resolveShopeeAffiliateUrl } from '../services/shopeeLinkImport';

test('extracts product details from Shopee Open Graph metadata', async () => {
  const html = '<html><head><meta content="Produto de teste | Shopee Brasil" property="og:title"><meta property="og:image" content="https://down-br.img.susercontent.com/image.png"><meta property="product:price:amount" content="1.234,56"></head></html>';
  const product = await parseShopeeProductPage(html, 'https://shopee.com.br/product/123/456', 'https://s.shopee.com.br/example');

  assert.equal(product.name, 'Produto de teste');
  assert.equal(product.price, 1234.56);
  assert.equal(product.externalProductId, '456');
  assert.equal(product.affiliateUrl, 'https://s.shopee.com.br/example');
});

test('extracts product price from JSON-LD when Open Graph has no price', async () => {
  const html = '<script type="application/ld+json">{"@type":"Product","name":"Fone Bluetooth","image":"https://down-br.img.susercontent.com/fone.png","offers":{"price":"49.90"}}</script>';
  const product = await parseShopeeProductPage(html, 'https://shopee.com.br/product/123/789', 'https://s.shopee.com.br/example');

  assert.equal(product.name, 'Fone Bluetooth');
  assert.equal(product.price, 49.9);
  assert.equal(product.externalProductId, '789');
});

test('rejects pages without verifiable title, image, and price', async () => {
  await assert.rejects(
    parseShopeeProductPage('<html><head><meta property="og:title" content="Sem dados"></head></html>', 'https://shopee.com.br/product/123/456', 'https://s.shopee.com.br/example'),
    /não forneceu nome, imagem HTTPS e preço verificáveis/,
  );
});

test('falls back to official product data for the exact ID in a short-link destination', async () => {
  const fetcher: typeof fetch = async (input) => {
    if (String(input) === 'https://s.shopee.com.br/example') {
      return new Response(null, { status: 302, headers: { location: 'https://shopee.com.br/product/123/456' } });
    }
    return new Response('<html><body>Product page without metadata</body></html>', { headers: { 'content-type': 'text/html' } });
  };
  const product = await resolveShopeeAffiliateUrl(
    'https://s.shopee.com.br/example',
    async (externalProductId) => ({
      productUrl: 'https://shopee.com.br/product/123/456',
      externalProductId,
      name: 'Fone Bluetooth teste',
      description: 'Fone para teste',
      imageUrl: 'https://down-br.img.susercontent.com/fone.png',
      price: 49.9,
      commissionPercentage: 8,
    }),
    fetcher,
  );

  assert.equal(product.externalProductId, '456');
  assert.equal(product.name, 'Fone Bluetooth teste');
  assert.equal(product.affiliateUrl, 'https://s.shopee.com.br/example');
  assert.equal(product.commissionPercentage, 8);
});

test('does not accept official product data with a different ID', async () => {
  const fetcher: typeof fetch = async (input) => {
    if (String(input) === 'https://s.shopee.com.br/example') {
      return new Response(null, { status: 302, headers: { location: 'https://shopee.com.br/product/123/456' } });
    }
    return new Response('<html><body>Product page without metadata</body></html>', { headers: { 'content-type': 'text/html' } });
  };

  await assert.rejects(
    resolveShopeeAffiliateUrl(
      'https://s.shopee.com.br/example',
      async () => ({
        productUrl: 'https://shopee.com.br/product/123/999',
        externalProductId: '999',
        name: 'Fone Bluetooth teste',
        description: 'Fone para teste',
        imageUrl: 'https://down-br.img.susercontent.com/fone.png',
        price: 49.9,
      }),
      fetcher,
    ),
    /A API oficial não confirmou o mesmo ID de produto/,
  );
});

test('finds the product ID in og:url when the redirect path is generic', async () => {
  const fetcher: typeof fetch = async (input) => {
    if (String(input) === 'https://s.shopee.com.br/example') {
      return new Response(null, { status: 302, headers: { location: 'https://shopee.com.br/redirect' } });
    }
    return new Response('<meta property="og:url" content="https://shopee.com.br/product/123/456">', { headers: { 'content-type': 'text/html' } });
  };
  const product = await resolveShopeeAffiliateUrl(
    'https://s.shopee.com.br/example',
    async (externalProductId) => ({
      productUrl: 'https://shopee.com.br/product/123/456',
      externalProductId,
      name: 'Fone Bluetooth teste',
      description: 'Fone para teste',
      imageUrl: 'https://down-br.img.susercontent.com/fone.png',
      price: 49.9,
    }),
    fetcher,
  );

  assert.equal(product.externalProductId, '456');
  assert.equal(product.productUrl, 'https://shopee.com.br/product/123/456');
});

test('extracts an item ID embedded in a Shopee SEO slug', async () => {
  const fetcher: typeof fetch = async (input) => {
    if (String(input) === 'https://s.shopee.com.br/example') {
      return new Response(null, { status: 302, headers: { location: 'https://shopee.com.br/fone-bluetooth-i.123.456' } });
    }
    return new Response('<html><body>Product page without metadata</body></html>', { headers: { 'content-type': 'text/html' } });
  };
  const product = await resolveShopeeAffiliateUrl(
    'https://s.shopee.com.br/example',
    async (externalProductId) => ({
      productUrl: 'https://shopee.com.br/fone-bluetooth-i.123.456',
      externalProductId,
      name: 'Fone Bluetooth teste',
      description: 'Fone para teste',
      imageUrl: 'https://down-br.img.susercontent.com/fone.png',
      price: 49.9,
    }),
    fetcher,
  );

  assert.equal(product.externalProductId, '456');
});

test('explains when the redirect and product page do not expose an item ID', async () => {
  const fetcher: typeof fetch = async (input) => {
    if (String(input) === 'https://s.shopee.com.br/example') {
      return new Response(null, { status: 302, headers: { location: 'https://shopee.com.br/redirect' } });
    }
    return new Response('<html><body>Product page without metadata</body></html>', { headers: { 'content-type': 'text/html' } });
  };

  await assert.rejects(
    resolveShopeeAffiliateUrl('https://s.shopee.com.br/example', async () => null, fetcher),
    /Não foi possível localizar o ID do produto no destino do link/,
  );
});