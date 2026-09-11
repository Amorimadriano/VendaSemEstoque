import assert from 'node:assert/strict';
import test from 'node:test';
import { nextRetryAt } from '../services/automationRun';

test('uses exponential retry delays capped at 24 hours', () => {
  const now = Date.UTC(2026, 0, 1);
  assert.equal(new Date(nextRetryAt(1, now)).getTime() - now, 15 * 60_000);
  assert.equal(new Date(nextRetryAt(3, now)).getTime() - now, 60 * 60_000);
  assert.equal(new Date(nextRetryAt(20, now)).getTime() - now, 24 * 60 * 60_000);
});