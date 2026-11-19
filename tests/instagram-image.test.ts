import assert from 'node:assert/strict';
import test from 'node:test';
import { InstagramImageError, validateInstagramImage } from '../lib/instagramImage';

test('rejects missing images and HTML pages before sending them to Meta', async () => {
  for (const status of [200, 404, 410]) {
    await assert.rejects(
      validateInstagramImage('https://images.example.test/missing.jpg', async () =>
        new Response('<html>Not found</html>', { status })),
      InstagramImageError,
    );
  }
});

test('requires JPEG bytes even if the URL or content type claims it is a JPEG', async () => {
  await assert.rejects(
    validateInstagramImage('https://images.example.test/photo.jpg', async () =>
      new Response(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), { headers: { 'Content-Type': 'image/jpeg' } })),
    /foto JPEG válida/,
  );
});

test('uses a stable JPEG URL for Unsplash rather than automatic format negotiation', async () => {
  const result = await validateInstagramImage(
    'https://images.unsplash.com/photo-example?w=700&auto=format&fit=crop',
    async (input) => {
      const url = new URL(String(input));
      assert.equal(url.searchParams.get('fm'), 'jpg');
      assert.equal(url.searchParams.has('auto'), false);
      assert.equal(url.searchParams.get('w'), '700');
      return new Response(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]));
    },
  );
  assert.equal(new URL(result).searchParams.get('fm'), 'jpg');
});

test('does not classify transient image server failures as skippable invalid images', async () => {
  for (const status of [429, 500, 503]) {
    await assert.rejects(
      validateInstagramImage('https://images.example.test/photo.jpg', async () => new Response(null, { status })),
      (error: unknown) => error instanceof Error && !(error instanceof InstagramImageError) && error.message.includes(String(status)),
    );
  }
});

test('rejects images exceeding the Instagram 8 MB limit', async () => {
  const bytes = new Uint8Array(8 * 1024 * 1024 + 1);
  bytes.set([0xff, 0xd8, 0xff]);
  await assert.rejects(
    validateInstagramImage('https://images.example.test/photo.jpg', async () => new Response(bytes)),
    /limite de 8 MB/,
  );
});
