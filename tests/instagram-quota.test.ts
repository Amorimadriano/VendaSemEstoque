import assert from 'node:assert/strict';
import test from 'node:test';
import { canPublishWithinInstagramQuota } from '../services/instagramPublisher';

test('allows publication while capacity is above the reserve', () => {
  assert.equal(canPublishWithinInstagramQuota({ quotaTotal: 100, quotaUsage: 94, remaining: 6 }, 5), true);
});

test('blocks publication when only the safety reserve remains', () => {
  assert.equal(canPublishWithinInstagramQuota({ quotaTotal: 100, quotaUsage: 95, remaining: 5 }, 5), false);
});