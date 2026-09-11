import assert from 'node:assert/strict';
import test from 'node:test';
import { appendMarketplaceTracking } from '../services/trackingService';

const cases = [
  ['amazon', 'ascsubtag'],
  ['shopee', 'sub_id'],
  ['mercadolivre', 'matt_word'],
  ['aliexpress', 'aff_platform'],
] as const;

for (const [marketplace, parameter] of cases) {
  test(`uses ${parameter} for ${marketplace}`, () => {
    const result = new URL(appendMarketplaceTracking('https://example.com/offer?tag=partner', marketplace, 'click-id'));
    assert.equal(result.searchParams.get(parameter), 'click-id');
    assert.equal(result.searchParams.get('tag'), 'partner');
  });
}