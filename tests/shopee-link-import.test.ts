import test from 'node:test';
import assert from 'node:assert/strict';
import { ShopeeIntegration } from '../integrations/shopee/ShopeeIntegration';
import { fetchShopeeProductDetails, parseShopeeProductPage, resolveShopeeAffiliateUrl } from '../services/shopeeLinkImport';
import { isMarketplaceProtectedFromAutomaticDeletion } from '../services/productPartnerVerifierAgent';

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

test('uses a supplied direct product URL without resolving the affiliate short link', async () => {
  const affiliateUrl = 'https://s.shopee.com.br/3g3wlh3aa7';
  const productUrl = 'https://shopee.com.br/product/1475933346/23994392192?mmp_pid=an_18316631281';
  let lookedUpId = '';
  const product = await resolveShopeeAffiliateUrl(
    affiliateUrl,
    async (externalProductId) => {
      lookedUpId = externalProductId;
      return {
        productUrl,
        externalProductId,
        name: 'Produto Shopee confirmado',
        description: 'Descrição do produto confirmado',
        imageUrl: 'https://down-br.img.susercontent.com/product.png',
        price: 99.9,
        commissionPercentage: 10,
      };
    },
    async () => {
      throw new Error('A URL curta não deve ser consultada quando há URL direta.');
    },
    productUrl,
  );

  assert.equal(lookedUpId, '23994392192');
  assert.equal(product.externalProductId, '23994392192');
  assert.equal(product.affiliateUrl, affiliateUrl);
  assert.equal(product.productUrl, productUrl);
});

test('maps Shopee direct item details, scaled prices, and image IDs', async () => {
  const product = await fetchShopeeProductDetails(
    '1475933346',
    '23994392192',
    'https://shopee.com.br/product/1475933346/23994392192',
    async () => new Response(JSON.stringify({
      data: {
        item: {
          shop_id: 1475933346,
          item_id: 23994392192,
          name: 'Produto direto Shopee',
          description: 'Detalhe de teste',
          price: 9990000,
          original_price: 19990000,
          images: ['sample-image-id'],
        },
      },
    }), { headers: { 'content-type': 'application/json' } }),
  );

  assert.equal(product.externalProductId, '23994392192');
  assert.equal(product.price, 99.9);
  assert.equal(product.oldPrice, 199.9);
  assert.equal(product.imageUrl, 'https://down-br.img.susercontent.com/file/sample-image-id');
});

test('queries the official affiliate API using exact shopId and itemId filters', async (t) => {
  const previousAppId = process.env.SHOPEE_APP_ID;
  const previousSecret = process.env.SHOPEE_SECRET;
  process.env.SHOPEE_APP_ID = 'test-app-id';
  process.env.SHOPEE_SECRET = 'test-secret';
  t.after(() => {
    if (previousAppId === undefined) delete process.env.SHOPEE_APP_ID;
    else process.env.SHOPEE_APP_ID = previousAppId;
    if (previousSecret === undefined) delete process.env.SHOPEE_SECRET;
    else process.env.SHOPEE_SECRET = previousSecret;
  });

  const integration = new ShopeeIntegration();
  const product = await integration.getProductByIds('1475933346', '23994392192', async (_input, init) => {
    const requestBody = JSON.parse(String(init?.body));
    assert.match(requestBody.query, /productOfferV2\(shopId: 1475933346, itemId: 23994392192/);
    return new Response(JSON.stringify({
      data: {
        productOfferV2: {
          nodes: [{
            shopId: 1475933346,
            itemId: 23994392192,
            productName: 'Produto por IDs Shopee',
            price: 99.9,
            imageUrl: 'https://down-br.img.susercontent.com/product.png',
            productLink: 'https://shopee.com.br/product/1475933346/23994392192',
            offerLink: 'https://s.shopee.com.br/affiliate',
            commissionRate: 10,
            sales: 5,
            ratingStar: 4.8,
          }],
        },
      },
    }), { headers: { 'content-type': 'application/json' } });
  });

  assert.equal(product?.externalProductId, '23994392192');
  assert.equal(product?.name, 'Produto por IDs Shopee');
});

test('does not mark a product unavailable when keyword search cannot confirm its ID', async (t) => {
  const previousAppId = process.env.SHOPEE_APP_ID;
  const previousSecret = process.env.SHOPEE_SECRET;
  process.env.SHOPEE_APP_ID = 'test-app-id';
  process.env.SHOPEE_SECRET = 'test-secret';
  t.after(() => {
    if (previousAppId === undefined) delete process.env.SHOPEE_APP_ID;
    else process.env.SHOPEE_APP_ID = previousAppId;
    if (previousSecret === undefined) delete process.env.SHOPEE_SECRET;
    else process.env.SHOPEE_SECRET = previousSecret;
  });

  const integration = new ShopeeIntegration();
  integration.getProducts = async () => [];

  const result = await integration.verifyProduct('23994392192');

  assert.equal(result.status, 'ERROR');
});

test('protects Shopee products from automatic deletion', () => {
  assert.equal(isMarketplaceProtectedFromAutomaticDeletion('shopee'), true);
  assert.equal(isMarketplaceProtectedFromAutomaticDeletion('amazon'), false);
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