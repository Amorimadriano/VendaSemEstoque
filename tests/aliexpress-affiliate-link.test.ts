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