import assert from 'node:assert/strict';
import test from 'node:test';
import { appendMarketplaceTracking } from '../services/trackingService';

const cases = [
  ['amazon', 'ascsubtag'],
  ['shopee', 'sub_id'],
] as const;

for (const [marketplace, parameter] of cases) {
  test(`uses ${parameter} for ${marketplace}`, () => {
    const result = new URL(appendMarketplaceTracking('https://example.com/offer?tag=partner', marketplace, 'click-id'));
    assert.equal(result.searchParams.get(parameter), 'click-id');
    assert.equal(result.searchParams.get('tag'), 'partner');
  });
}

test('preserves the AliExpress promotion link during click tracking', () => {
  const promotionLink = 'https://s.click.aliexpress.com/e/example?tracking_id=partner';
  assert.equal(appendMarketplaceTracking(promotionLink, 'aliexpress', 'click-id'), promotionLink);
});