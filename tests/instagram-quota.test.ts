import assert from 'node:assert/strict';
import test from 'node:test';
import { canPublishWithinInstagramQuota, waitForInstagramMediaContainer } from '../services/instagramPublisher';

test('allows publication while capacity is above the reserve', () => {
  assert.equal(canPublishWithinInstagramQuota({ quotaTotal: 100, quotaUsage: 94, remaining: 6 }, 5), true);
});

test('blocks publication when only the safety reserve remains', () => {
  assert.equal(canPublishWithinInstagramQuota({ quotaTotal: 100, quotaUsage: 95, remaining: 5 }, 5), false);
});

test('waits until an Instagram image container is ready to publish', async () => {
  const statuses = ['IN_PROGRESS', 'FINISHED'];
  const waited: number[] = [];
  await waitForInstagramMediaContainer(
    'container-id',
    'test-token',
    async () => new Response(JSON.stringify({ status_code: statuses.shift() }), { status: 200 }),
    async (milliseconds) => { waited.push(milliseconds); },
  );

  assert.deepEqual(waited, [2000]);
});

test('does not publish an errored Instagram image container', async () => {
  await assert.rejects(
    waitForInstagramMediaContainer(
      'container-id',
      'test-token',
      async () => new Response(JSON.stringify({ status_code: 'ERROR', status: 'Image processing failed' }), { status: 200 }),
      async () => undefined,
    ),
    /Instagram não concluiu o processamento da mídia/,
  );
});