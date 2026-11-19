import assert from 'node:assert/strict';
import test from 'node:test';
import { AliExpressIntegration } from '../integrations/aliexpress/AliExpressIntegration';

test('generates an AliExpress promotion link through the affiliate API', async () => {
  const originalFetch = globalThis.fetch;
  const originalEnvironment = {
    appKey: process.env.ALIEXPRESS_APP_KEY,
    appSecret: process.env.ALIEXPRESS_APP_SECRET,
    trackingId: process.env.ALIEXPRESS_TRACKING_ID,
  };
  const sourceUrl = 'https://pt.aliexpress.com/item/1005001234567890.html';
  const promotionUrl = 'https://s.click.aliexpress.com/e/example';
  let requestUrl = '';

  process.env.ALIEXPRESS_APP_KEY = 'test-app-key';
  process.env.ALIEXPRESS_APP_SECRET = 'test-app-secret';
  process.env.ALIEXPRESS_TRACKING_ID = 'test-tracking-id';
  globalThis.fetch = async (input) => {
    requestUrl = String(input);
    return Response.json({
      aliexpress_affiliate_link_generate_response: {
        resp_result: {
          result: {
            promotion_links: {
              promotion_link: [{ promotion_link: promotionUrl }],
            },
          },
        },
      },
    });
  };

  try {
    const affiliateUrl = await new AliExpressIntegration().createAffiliateLink(sourceUrl);
    const params = new URL(requestUrl).searchParams;

    assert.equal(affiliateUrl, promotionUrl);
    assert.equal(params.get('method'), 'aliexpress.affiliate.link.generate');
    assert.equal(params.get('source_values'), sourceUrl);
    assert.equal(params.get('tracking_id'), 'test-tracking-id');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalEnvironment.appKey === undefined) delete process.env.ALIEXPRESS_APP_KEY;
    else process.env.ALIEXPRESS_APP_KEY = originalEnvironment.appKey;
    if (originalEnvironment.appSecret === undefined) delete process.env.ALIEXPRESS_APP_SECRET;
    else process.env.ALIEXPRESS_APP_SECRET = originalEnvironment.appSecret;
    if (originalEnvironment.trackingId === undefined) delete process.env.ALIEXPRESS_TRACKING_ID;
    else process.env.ALIEXPRESS_TRACKING_ID = originalEnvironment.trackingId;
  }
});

test('normalizes percentage ratings and commissions from AliExpress products', async () => {
  const originalFetch = globalThis.fetch;
  const originalEnvironment = {
    appKey: process.env.ALIEXPRESS_APP_KEY,
    appSecret: process.env.ALIEXPRESS_APP_SECRET,
    trackingId: process.env.ALIEXPRESS_TRACKING_ID,
  };

  process.env.ALIEXPRESS_APP_KEY = 'test-app-key';
  process.env.ALIEXPRESS_APP_SECRET = 'test-app-secret';
  process.env.ALIEXPRESS_TRACKING_ID = 'test-tracking-id';
  globalThis.fetch = async () => Response.json({
    aliexpress_affiliate_product_query_response: {
      resp_result: {
        result: {
          products: {
            product: [{
              product_id: '1005001234567890',
              product_title: 'Caixa de som bluetooth portátil',
              product_detail_url: 'https://www.aliexpress.com/item/1005001234567890.html',
              product_main_image_url: 'https://example.com/product.jpg',
              target_sale_price: '49.90',
              target_original_price: '99.90',
              commission_rate: '5.00%',
              evaluate_rate: '98.0%',
              lastest_volume: '120',
              promotion_link: 'https://s.click.aliexpress.com/e/example',
            }],
          },
        },
      },
    },
  });

  try {
    const [product] = await new AliExpressIntegration().getProducts('bluetooth', undefined, 1);

    assert.equal(product.rating, 4.9);
    assert.equal(product.commissionPercentage, 5);
    assert.equal(Number.isFinite(product.rating), true);
    assert.equal(Number.isFinite(product.commissionValue), true);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalEnvironment.appKey === undefined) delete process.env.ALIEXPRESS_APP_KEY;
    else process.env.ALIEXPRESS_APP_KEY = originalEnvironment.appKey;
    if (originalEnvironment.appSecret === undefined) delete process.env.ALIEXPRESS_APP_SECRET;
    else process.env.ALIEXPRESS_APP_SECRET = originalEnvironment.appSecret;
    if (originalEnvironment.trackingId === undefined) delete process.env.ALIEXPRESS_TRACKING_ID;
    else process.env.ALIEXPRESS_TRACKING_ID = originalEnvironment.trackingId;
  }
});

test('verifies curated AliExpress IDs through the live product detail API', async (t) => {
  const originalFetch = globalThis.fetch;
  const keys = ['ALIEXPRESS_APP_KEY', 'ALIEXPRESS_APP_SECRET', 'ALIEXPRESS_TRACKING_ID'] as const;
  const originalEnvironment = keys.map((key) => process.env[key]);
  for (const key of keys) process.env[key] = 'test-credential';
  t.after(() => {
    globalThis.fetch = originalFetch;
    keys.forEach((key, index) => {
      if (originalEnvironment[index] === undefined) delete process.env[key];
      else process.env[key] = originalEnvironment[index];
    });
  });

  const id = '1005010672750703';
  const product = {
    product_id: id,
    product_title: 'Produto retornado pela API oficial',
    product_main_image_url: 'https://example.com/product.jpg',
    target_sale_price: '42.90',
    promotion_link: 'https://s.click.aliexpress.com/e/verified',
  };
  for (const scenario of [
    { name: 'live data replaces static catalog data', products: [product], status: 'VERIFIED' },
    { name: 'empty live results do not confirm a curated product', products: [], status: 'NOT_FOUND' },
    { name: 'another product is not an exact ID verification', products: [{ ...product, product_id: '999999999' }], status: 'NOT_FOUND' },
    { name: 'link generation failure returns ERROR rather than throwing', products: [{ ...product, promotion_link: '' }], status: 'ERROR' },
  ]) {
    await t.test(scenario.name, async () => {
      const methods: string[] = [];
      globalThis.fetch = async (input) => {
        const method = new URL(String(input)).searchParams.get('method') || '';
        methods.push(method);
        if (method === 'aliexpress.affiliate.link.generate') return Response.json({ result: {} });
        assert.equal(method, 'aliexpress.affiliate.productdetail.get');
        return Response.json({
          aliexpress_affiliate_productdetail_get_response: {
            resp_result: { result: { products: { product: scenario.products } } },
          },
        });
      };
      const result = await new AliExpressIntegration().verifyProduct(id);
      assert.equal(result.status, scenario.status);
      assert.equal(methods[0], 'aliexpress.affiliate.productdetail.get');
      if (result.status === 'VERIFIED') {
        assert.equal(result.product?.price, 42.9);
        assert.equal(result.product?.name, product.product_title);
        assert.equal(methods.length, 1);
      }
      if (result.status === 'ERROR') assert.match(result.reason || '', /link promocional válido/);
    });
  }
});