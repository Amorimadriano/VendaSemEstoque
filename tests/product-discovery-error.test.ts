import assert from 'node:assert/strict';
import test from 'node:test';
import { formatSyncError } from '../services/productDiscovery';

test('formats structured Supabase errors with message, code, details, and hint', () => {
  const message = formatSyncError({
    message: 'new row violates row-level security policy',
    code: '42501',
    details: 'policy denied insert on products',
    hint: 'check the service role key',
  });

  assert.equal(
    message,
    'new row violates row-level security policy | code=42501 | details=policy denied insert on products | hint=check the service role key'
  );
});

test('formats Error instances and primitive errors without losing their message', () => {
  assert.equal(formatSyncError(new Error('network unavailable')), 'network unavailable');
  assert.equal(formatSyncError('plain failure'), 'plain failure');
});