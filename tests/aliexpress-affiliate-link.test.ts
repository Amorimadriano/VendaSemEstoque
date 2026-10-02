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