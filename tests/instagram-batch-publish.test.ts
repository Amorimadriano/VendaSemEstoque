import assert from 'node:assert/strict';
import test from 'node:test';
import { publishPendingChannelBatch } from '../services/batchPublishService';

test('Instagram batches handle invalid images without hiding transient failures', async (t) => {
  const originalFetch = globalThis.fetch;
  const environment = {
    SUPABASE_URL: 'https://database.example.test',
    SUPABASE_SERVICE_ROLE_KEY: 'test-key',
    META_ACCESS_TOKEN: 'test-token',
    META_INSTAGRAM_ACCOUNT_ID: 'test-account',
  };
  const keys = Object.keys(environment) as Array<keyof typeof environment>;
  const originalEnvironment = keys.map((key) => process.env[key]);
  for (const key of keys) process.env[key] = environment[key];
  t.after(() => {
    globalThis.fetch = originalFetch;
    keys.forEach((key, index) => {
      if (originalEnvironment[index] === undefined) delete process.env[key];
      else process.env[key] = originalEnvironment[index];
    });
  });

  await t.test('Instagram batches use a separate post while a Reel video is unavailable', async (t) => {
    const product = {
      id: 'product-1',
      name: 'Produto de teste completo',
      description: 'Descrição completa do produto para publicação no Instagram.',
      image_url: 'https://images.example.test/product.jpg',
      affiliate_url: 'https://affiliate.example.test/product',
      price: 99,
      status: 'ACTIVE',
    };

    for (const scenario of ['missing', 'rendering', 'existing-post', 'ready', 'video-error'] as const) {
      await t.test(scenario, async () => {
        const updates: string[] = [];
        const mediaBodies: URLSearchParams[] = [];
        let insertedPost = false;
        globalThis.fetch = async (input, init) => {
          const url = new URL(input instanceof Request ? input.url : String(input));
          if (url.hostname === 'images.example.test') return new Response(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]));
          if (url.hostname === 'database.example.test') {
            if (url.pathname.endsWith('/products')) {
              return Response.json(url.searchParams.has('id') ? product : [product]);
            }
            if (url.pathname.endsWith('/marketing_videos')) {
              if (scenario === 'video-error') return Response.json({ message: 'Video lookup failed' }, { status: 500 });
              if (scenario === 'missing' || scenario === 'existing-post') return Response.json(null);
              return Response.json({
                status: scenario === 'ready' ? 'SUCCEEDED' : 'RENDERING',
                video_url: scenario === 'ready' ? 'https://videos.example.test/reel.mp4' : null,
              });
            }
            assert.ok(url.pathname.endsWith('/marketing_content'));
            if (init?.method === 'POST') {
              const body = JSON.parse(String(init.body)) as { content_type: string };
              assert.equal(body.content_type, 'POST');
              insertedPost = true;
              return Response.json({ id: 'new-post', status: 'DRAFT', content_type: 'POST' });
            }
            if (init?.method === 'PATCH') {
              updates.push(url.searchParams.get('id') || '');
              return new Response(null, { status: 204 });
            }
            const select = url.searchParams.get('select') || '';
            if (select === 'product_id') return Response.json([]);
            if (select === 'id,external_post_id') return Response.json(null);
            if (select === 'id,status,content_type') {
              if (url.searchParams.get('content_type') === 'eq.POST') {
                return Response.json(scenario === 'existing-post'
                  ? { id: 'existing-post', status: 'APPROVED', content_type: 'POST' }
                  : null);
              }
              return Response.json({ id: 'reel', status: 'APPROVED', content_type: 'REEL' });
            }
            const id = url.searchParams.get('id')?.replace('eq.', '');
            return Response.json({
              id,
              product_id: product.id,
              content_type: id === 'reel' ? 'REEL' : 'POST',
              product,
              hook: 'Confira esta oferta',
              caption: 'Detalhes da oferta',
              cta: 'Veja no link da bio',
            });
          }
          assert.equal(url.hostname, 'graph.facebook.com');
          if (url.pathname.endsWith('/content_publishing_limit')) {
            return Response.json({ data: [{ config: { quota_total: 100 }, quota_usage: 0 }] });
          }
          if (url.pathname.endsWith('/media')) {
            mediaBodies.push(new URLSearchParams(String(init?.body)));
            return Response.json({ id: 'container-id' });
          }
          if (url.pathname.endsWith('/media_publish')) return Response.json({ id: 'published-id' });
          assert.ok(url.pathname.endsWith('/container-id'));
          return Response.json({ status_code: 'FINISHED' });
        };

        const result = await publishPendingChannelBatch('instagram', { maxItems: 1, delayMs: 0 });
        if (scenario === 'video-error') {
          assert.equal(result.failed, 1);
          assert.match(result.results[0].error || '', /Video lookup failed/);
          assert.equal(mediaBodies.length, 0);
          assert.equal(insertedPost, false);
          return;
        }
        assert.equal(result.published, 1);
        assert.equal(result.failed, 0);
        assert.equal(insertedPost, scenario === 'missing' || scenario === 'rendering');
        assert.equal(mediaBodies[0].get('media_type'), scenario === 'ready' ? 'REELS' : null);
        assert.equal(mediaBodies[0].get(scenario === 'ready' ? 'video_url' : 'image_url'),
          scenario === 'ready' ? 'https://videos.example.test/reel.mp4' : product.image_url);
        assert.ok(updates.includes(`eq.${scenario === 'ready' ? 'reel' : scenario === 'existing-post' ? 'existing-post' : 'new-post'}`));
        if (scenario !== 'ready') assert.ok(!updates.includes('eq.reel'));
      });
    }
  });

  for (const imageStatus of [404, 500]) {
    await t.test(`first image returns HTTP ${imageStatus}`, async () => {
      const createdImages: string[] = [];
      const persistedPublications: string[] = [];
      const products = ['broken', 'valid', 'extra'].map((id) => ({
        id,
        name: `Produto de teste ${id}`,
        description: 'Descrição completa do produto para publicação no Instagram.',
        image_url: `https://images.example.test/${id}.jpg`,
        affiliate_url: 'https://affiliate.example.test/product',
        price: 99,
        status: 'ACTIVE',
      }));
      globalThis.fetch = async (input, init) => {
        const url = new URL(input instanceof Request ? input.url : String(input));
        if (url.hostname === 'images.example.test') {
          if (url.pathname === '/broken.jpg') return new Response('Image unavailable', { status: imageStatus });
          return new Response(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]));
        }
        if (url.hostname === 'database.example.test') {
          if (url.pathname.endsWith('/products')) return Response.json(products);
          assert.ok(url.pathname.endsWith('/marketing_content'));
          if (init?.method === 'PATCH') {
            persistedPublications.push(url.searchParams.get('id') || '');
            return new Response(null, { status: 204 });
          }
          const select = url.searchParams.get('select') || '';
          if (select === 'product_id') return Response.json([]);
          if (select === 'id,external_post_id') return Response.json(null);
          if (select === 'id,status,content_type') {
            return Response.json({
              id: `draft-${url.searchParams.get('product_id')?.replace('eq.', '')}`,
              status: 'APPROVED',
              content_type: 'POST',
            });
          }
          const id = url.searchParams.get('id')?.replace('eq.draft-', '');
          return Response.json({
            id: `draft-${id}`,
            product_id: id,
            content_type: 'POST',
            product: products.find((product) => product.id === id),
            hook: 'Confira esta oferta',
            caption: 'Detalhes da oferta',
            cta: 'Veja no link da bio',
          });
        }
        assert.equal(url.hostname, 'graph.facebook.com');
        if (url.pathname.endsWith('/content_publishing_limit')) {
          return Response.json({ data: [{ config: { quota_total: 100 }, quota_usage: 0 }] });
        }
        if (url.pathname.endsWith('/media')) {
          const body = new URLSearchParams(String(init?.body));
          createdImages.push(body.get('image_url') || '');
          return Response.json({ id: 'container-id' });
        }
        if (url.pathname.endsWith('/media_publish')) return Response.json({ id: 'published-id' });
        assert.ok(url.pathname.endsWith('/container-id'));
        return Response.json({ status_code: 'FINISHED' });
      };

      const result = await publishPendingChannelBatch('instagram', { maxItems: 1, delayMs: 0 });
      if (imageStatus === 404) {
        assert.equal(result.attempted, 2);
        assert.equal(result.skipped, 1);
        assert.equal(result.failed, 0);
        assert.equal(result.published, 1);
        assert.equal(result.results[0].skipped, true);
        assert.match(result.results[0].error || '', /HTTP 404/);
        assert.deepEqual(createdImages, ['https://images.example.test/valid.jpg']);
        assert.deepEqual(persistedPublications, ['eq.draft-valid']);
      } else {
        assert.equal(result.attempted, 1);
        assert.equal(result.skipped, 0);
        assert.equal(result.failed, 1);
        assert.equal(result.published, 0);
        assert.deepEqual(createdImages, []);
        assert.deepEqual(persistedPublications, []);
      }
    });
  }
});
