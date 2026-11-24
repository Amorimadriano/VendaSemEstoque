import assert from 'node:assert/strict';
import test from 'node:test';
import { createHmac } from 'node:crypto';
import { NextRequest } from 'next/server';
import { commissionCents, moneyToCents, partnerPaymentEnvironmentStatus, partnerProductImages, partnerProductSchema, PartnerOrder, requirePartnerPayments } from '../lib/partner';
import { assertPartnerOrigin, createPartnerSession, readPartnerBytes, readPartnerJson, verifyPartnerSession } from '../lib/partnerAuth';
import { PARTNER_PHOTO_MAX_BYTES, validatePartnerPhoto } from '../lib/partnerPhoto';
import { decryptPartnerTokens, encryptPartnerTokens, partnerPreference, paymentSchema, validatePartnerPayment, verifyMercadoPagoSignature } from '../services/partnerPayments';
import { POST as checkout } from '../app/api/checkout/parceiros/route';
import { POST as sellerAction } from '../app/api/parceiros/painel/route';
import { POST as uploadPhoto } from '../app/api/parceiros/fotos/route';
import { PATCH as moderate } from '../app/api/admin/parceiros/route';
import automationWorker from '../cloudflare/automation-worker.js';

const order: PartnerOrder = {
  id: 'adee6d0f-1ea7-4a46-822d-8be8cb663d58', product_id: '7190bc02-8230-4bdf-af68-e954ed313503',
  partner_id: '58a9eb87-3556-44e1-9791-5a7196295c29', product_name: 'Produto próprio para teste',
  total_cents: 19990, commission_bps: 1000, commission_cents: 1999, buyer: {
    name: 'Cliente Teste', email: 'cliente@example.com', phone: '11999999999', address: 'Rua de Teste, 123',
    postal_code: '01001000', city: 'São Paulo', state: 'SP',
  }, status: 'PENDING', fulfillment_status: 'UNFULFILLED', tracking_code: null, preference_id: null, checkout_url: null,
  paid_cents: 0, refunded_cents: 0, earned_commission_cents: 0,
  receipt_token: '978ba0d0-908a-4ad0-859b-2e6d03a5461f', created_at: '2026-11-24T15:00:00Z', expires_at: '2026-11-24T15:30:00Z',
};

test('payment diagnostics report only allowed variable names and presence, never secret values', () => {
  const status = partnerPaymentEnvironmentStatus({
    PARTNER_COMMISSION_BPS: '1000', MERCADOPAGO_CLIENT_SECRET: 'private-test-secret',
    PARTNER_PAYMENTS_ENABLED: 'false', MERCADOPAGO_CLIENT_ID: '', UNRELATED_SECRET: 'not-for-diagnostics',
  });
  assert.equal(status.find((value) => value.name === 'PARTNER_COMMISSION_BPS')?.present, true);
  assert.equal(status.find((value) => value.name === 'PARTNER_PAYMENTS_ENABLED')?.present, true);
  assert.equal(status.find((value) => value.name === 'MERCADOPAGO_CLIENT_ID')?.present, false);
  assert.equal(status.find((value) => value.name === 'MERCADOPAGO_WEBHOOK_SECRET')?.present, false);
  for (const secret of ['1000', 'private-test-secret', 'UNRELATED_SECRET', 'not-for-diagnostics']) {
    assert.equal(JSON.stringify(status).includes(secret), false);
  }
});

test('calculates fees and BRL amounts using integer cents without accepting invalid money', () => {
  assert.equal(commissionCents(19990, 1000), 1999);
  assert.equal(commissionCents(1005, 1000), 101);
  assert.equal(moneyToCents('19.99'), 1999);
  assert.equal(moneyToCents(0.1), 10);
  for (const invalid of [-1, NaN, Infinity, '0.001', '1e10', '1,90', ' 10']) assert.throws(() => moneyToCents(invalid));
  assert.throws(() => commissionCents(100, 10000));
});

test('validates seller publication data and does not accept a seller-selected approval status', () => {
  const input = {
    name: 'Produto de teste', description: 'Descrição completa e verdadeira do produto enviado para análise.',
    image_url: 'https://example.com/image.jpg', price_cents: 19990, stock: 3, delivery_days: 10,
    return_policy: 'Atendimento e devoluções conforme a legislação aplicável.', status: 'ACTIVE', partner_id: order.partner_id,
  };
  const parsed = partnerProductSchema.parse(input);
  assert.equal('status' in parsed, false);
  assert.equal('partner_id' in parsed, false);
  assert.equal(partnerProductSchema.safeParse({ ...input, image_url: 'javascript:alert(1)' }).success, false);
  assert.equal(partnerProductSchema.safeParse({ ...input, price_cents: 99.9 }).success, false);
});

test('partner sessions are scoped, signed, Unicode-safe and reject forgery and expired tokens', async (t) => {
  const original = process.env.NEXTAUTH_SECRET;
  process.env.NEXTAUTH_SECRET = 'test-secret-with-at-least-thirty-two-characters';
  t.after(() => { if (original === undefined) delete process.env.NEXTAUTH_SECRET; else process.env.NEXTAUTH_SECRET = original; });
  const token = await createPartnerSession(order.partner_id);
  assert.equal(await verifyPartnerSession(token), order.partner_id);
  assert.equal(await verifyPartnerSession(token + '.extra'), null);
  assert.equal(await verifyPartnerSession('malformed'), null);
  const [payload, signature] = token.split('.');
  assert.equal(await verifyPartnerSession(`${payload.slice(0, -2)}AA.${signature}`), null);
  const expired = Buffer.from(JSON.stringify({ id: order.partner_id, scope: 'partner', exp: 1 })).toString('base64url');
  const hmac = createHmac('sha256', `partner:${process.env.NEXTAUTH_SECRET}`).update(expired).digest('base64url');
  assert.equal(await verifyPartnerSession(`${expired}.${hmac}`), null);
});

test('gallery preserves legacy covers and validates ordered, unique HTTPS photos up to ten', () => {
  const image = 'https://example.com/cover.jpg';
  const input = {
    name: 'Produto de teste', description: 'Descrição completa e verdadeira do produto enviado para análise.',
    image_url: image, price_cents: 19990, stock: 3, delivery_days: 10,
    return_policy: 'Atendimento e devoluções conforme a legislação aplicável.',
  };
  assert.deepEqual(partnerProductImages({ image_url: image }), [image]);
  assert.deepEqual(partnerProductImages({ image_url: image, image_urls: [] }), [image]);
  assert.deepEqual(partnerProductImages({ image_url: image, image_urls: [image, 'https://example.com/extra.png'] }), [image, 'https://example.com/extra.png']);
  const images = Array.from({ length: 10 }, (_, index) => `https://example.com/${index}.png`);
  assert.equal(partnerProductSchema.safeParse({ ...input, image_url: images[0], image_urls: images }).success, true);
  for (const invalid of [[], [image, image], [image, 'http://example.com/extra.jpg'], [...images, image]]) {
    assert.equal(partnerProductSchema.safeParse({ ...input, image_urls: invalid }).success, false);
  }
});

test('seller writes persist complete galleries, reject inconsistent covers and accept full-length metadata', async (t) => {
  const keys = ['NEXTAUTH_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const;
  const previous = keys.map((key) => process.env[key]);
  const originalFetch = globalThis.fetch;
  process.env.NEXTAUTH_SECRET = 'test-secret-with-at-least-thirty-two-characters';
  process.env.SUPABASE_URL = 'https://gallery-test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role';
  t.after(() => {
    globalThis.fetch = originalFetch;
    keys.forEach((key, index) => { if (previous[index] === undefined) delete process.env[key]; else process.env[key] = previous[index]; });
  });
  const stored: Record<string, unknown>[] = [];
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    const path = new URL(request.url).pathname;
    if (path === '/rest/v1/partners') return Response.json({ id: order.partner_id, status: 'PENDING' });
    if (path === '/rest/v1/rpc/partner_rate_limit') return Response.json(true);
    if (path === '/rest/v1/partner_products' && request.method === 'POST') {
      stored.push(await request.json()); return Response.json({ id: order.product_id });
    }
    throw new Error(`Unexpected gallery request: ${path}`);
  };
  const token = await createPartnerSession(order.partner_id);
  const images = Array.from({ length: 10 }, (_, index) => `https://example.com/${index}-${'x'.repeat(1900)}`);
  const product = { action: 'product', name: 'Produto para galeria', description: 'x'.repeat(5000), image_url: images[0],
    image_urls: images, price_cents: 1000, stock: 1, delivery_days: 10, return_policy: 'x'.repeat(2000) };
  const request = (body: object) => new NextRequest('https://example.com/api/parceiros/painel', {
    method: 'POST', headers: { origin: 'https://example.com', cookie: `partner_session=${token}` }, body: JSON.stringify(body),
  });
  assert(JSON.stringify(product).length > 20000);
  assert.equal((await sellerAction(request(product))).status, 200);
  assert.deepEqual(stored[0].image_urls, images);
  assert.equal(stored[0].status, 'PENDING_REVIEW');
  assert.equal((await sellerAction(request({ ...product, image_url: images[1] }))).status, 400);
  assert.equal(stored.length, 1);
  const { image_urls: _gallery, ...legacy } = product;
  assert.equal((await sellerAction(request(legacy))).status, 200);
  assert.equal('image_urls' in stored[1], false);
});

test('rejects cross-origin mutations and oversized payloads before processing', async () => {
  assert.doesNotThrow(() => assertPartnerOrigin(new Request('http://localhost:3100/api/parceiros/auth', {
    headers: { host: '127.0.0.1:3100', origin: 'http://127.0.0.1:3100' },
  })));
  assert.throws(() => assertPartnerOrigin(new Request('https://example.com/api/parceiros/auth', { headers: { origin: 'https://attacker.example' } })));
  const response = await sellerAction(new NextRequest('https://example.com/api/parceiros/painel', {
    method: 'POST', headers: { origin: 'https://attacker.example' }, body: '{}',
  }));
  assert.equal(response.status, 403);
  await assert.rejects(readPartnerJson(new Request('https://example.com', { method: 'POST', body: 'x'.repeat(20001) })), /muito grande/);
});

test('seller writes and moderation require their separate authenticated sessions', async () => {
  for (const handler of [sellerAction, moderate, uploadPhoto]) {
    const result = await handler(new NextRequest('https://example.com/api/test', {
      method: 'POST', headers: { origin: 'https://example.com', 'Content-Type': 'application/json' }, body: '{}',
    }));
    assert.equal(result.status, 401);
  }
});

test('photo uploads validate content signatures and bound streamed bodies without trusting headers', async () => {
  const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10]);
  assert.equal(validatePartnerPhoto(png, 'image/png'), 'png');
  assert.equal(validatePartnerPhoto(Uint8Array.from([255, 216, 255, 224]), 'image/jpeg'), 'jpg');
  assert.equal(validatePartnerPhoto(new TextEncoder().encode('RIFF0000WEBP'), 'image/webp'), 'webp');
  assert.throws(() => validatePartnerPhoto(png, 'image/jpeg'), /inválido/);
  assert.throws(() => validatePartnerPhoto(new TextEncoder().encode('<svg/>'), 'image/svg+xml'), /inválido/);
  assert.throws(() => validatePartnerPhoto(new Uint8Array(), 'image/png'), /Selecione/);
  assert.throws(() => validatePartnerPhoto(new Uint8Array(PARTNER_PHOTO_MAX_BYTES + 1), 'image/png'), /5 MB/);
  const request = new Request('https://example.com', { method: 'POST', body: '12345' });
  await assert.rejects(readPartnerBytes(request, 4), /muito grande/);
  await assert.rejects(readPartnerBytes(new Request('https://example.com', {
    method: 'POST', headers: { 'content-length': '100' }, body: '1',
  }), 4), /muito grande/);
});

test('photo storage uses the authenticated owner and never returns success after a storage failure', async (t) => {
  const keys = ['NEXTAUTH_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const;
  const previous = keys.map((key) => process.env[key]);
  const originalFetch = globalThis.fetch;
  process.env.NEXTAUTH_SECRET = 'test-secret-with-at-least-thirty-two-characters';
  process.env.SUPABASE_URL = 'https://storage-test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role';
  t.after(() => {
    globalThis.fetch = originalFetch;
    keys.forEach((key, index) => {
      if (previous[index] === undefined) delete process.env[key]; else process.env[key] = previous[index];
    });
  });
  let suspended = false;
  let storageFails = false;
  const storedPaths: string[] = [];
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    if (url.pathname === '/rest/v1/partners') return Response.json({ id: order.partner_id, status: suspended ? 'SUSPENDED' : 'PENDING' });
    if (url.pathname === '/rest/v1/rpc/partner_rate_limit') return Response.json(true);
    if (url.pathname.startsWith('/storage/v1/object/partner-products/')) {
      assert.equal(request.headers.get('content-type'), 'image/png');
      storedPaths.push(url.pathname);
      return storageFails ? Response.json({ message: 'Test storage failure' }, { status: 400 })
        : Response.json({ Key: url.pathname, Id: 'photo-id' });
    }
    throw new Error(`Unexpected photo request: ${url.pathname}`);
  };
  const token = await createPartnerSession(order.partner_id);
  const request = () => new NextRequest('https://example.com/api/parceiros/fotos', {
    method: 'POST', headers: { origin: 'https://example.com', cookie: `partner_session=${token}`, 'content-type': 'image/png' },
    body: Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10]),
  });
  const response = await uploadPhoto(request());
  assert.equal(response.status, 201);
  assert.match((await response.json()).image_url, new RegExp(`/partner-products/${order.partner_id}/[\\da-f-]+\\.png$`));
  assert.equal(storedPaths.length, 1);
  suspended = true;
  assert.equal((await uploadPhoto(request())).status, 403);
  assert.equal(storedPaths.length, 1);
  suspended = false; storageFails = true;
  const failed = await uploadPhoto(request());
  assert.equal(failed.status, 500);
  assert.equal('image_url' in await failed.json(), false);
});

test('frequent payment reconciliation never invokes social publishing workflows', async (t) => {
  const originalFetch = globalThis.fetch;
  const urls: string[] = [];
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async (input) => { urls.push(String(input)); return Response.json({ reconciled: 0 }); };
  await automationWorker.scheduled({ cron: '*/15 * * * *' }, { APP_BASE_URL: 'https://example.com', AUTOMATION_API_SECRET: 'test-secret' });
  assert.deepEqual(urls, ['https://example.com/api/admin/automation/partner-orders']);
});

test('validates signed payment notifications, encrypted tokens and authoritative split data', async (t) => {
  const keys = ['MERCADOPAGO_CLIENT_ID','MERCADOPAGO_CLIENT_SECRET','MERCADOPAGO_WEBHOOK_SECRET','MERCADOPAGO_MODE',
    'PARTNER_TOKEN_ENCRYPTION_KEY','PARTNER_COMMISSION_BPS','PARTNER_PAYMENTS_ENABLED'] as const;
  const previous = keys.map((key) => process.env[key]);
  process.env.MERCADOPAGO_CLIENT_ID = '123';
  process.env.MERCADOPAGO_CLIENT_SECRET = 'client-test-secret';
  process.env.MERCADOPAGO_WEBHOOK_SECRET = 'webhook-test-secret';
  process.env.MERCADOPAGO_MODE = 'sandbox';
  process.env.PARTNER_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
  process.env.PARTNER_COMMISSION_BPS = '1000';
  process.env.PARTNER_PAYMENTS_ENABLED = 'false';
  t.after(() => keys.forEach((key, index) => {
    if (previous[index] === undefined) delete process.env[key]; else process.env[key] = previous[index];
  }));

  await t.test('new checkouts fail closed while disabled', async () => {
    assert.throws(requirePartnerPayments, /não estão habilitados/);
    const result = await checkout(new NextRequest('https://example.com/api/checkout/parceiros', {
      method: 'POST', headers: { origin: 'https://example.com' }, body: '{}',
    }));
    assert.equal(result.status, 503);
  });
  await t.test('verifies the provider manifest instead of trusting the body or a browser redirect', async () => {
    const manifest = 'id:123456;request-id:request-123;ts:1704908010;';
    const signature = createHmac('sha256', 'webhook-test-secret').update(manifest).digest('hex');
    const request = new Request('https://example.com/api/webhooks/mercadopago', { headers: {
      'x-request-id': 'request-123', 'x-signature': `ts=1704908010,v1=${signature}`,
    } });
    assert.equal(await verifyMercadoPagoSignature(request, '123456'), true);
    assert.equal(await verifyMercadoPagoSignature(request, '654321'), false);
    assert.equal(await verifyMercadoPagoSignature(new Request(request.url), '123456'), false);
  });
  await t.test('encrypts tokens with authentication and never stores plaintext credentials', async () => {
    const tokens = { access_token: 'seller-access', refresh_token: 'seller-refresh' };
    const encrypted = await encryptPartnerTokens(tokens);
    assert.equal(encrypted.includes(tokens.access_token), false);
    assert.deepEqual(await decryptPartnerTokens(encrypted), tokens);
    const [iv, payload] = encrypted.split('.');
    const modified = (payload.startsWith('A') ? 'B' : 'A') + payload.slice(1);
    await assert.rejects(decryptPartnerTokens(`${iv}.${modified}`));
  });
  await t.test('confirms fees, seller, environment and amounts using the canonical provider payment', () => {
    const payment = paymentSchema.parse({
      id: 123456, external_reference: order.id, collector_id: 987, application_id: 123, currency_id: 'BRL', live_mode: false, status: 'approved',
      transaction_amount: 199.9, transaction_amount_refunded: 0, date_last_updated: '2026-11-24T15:05:00Z',
      fee_details: [{ type: 'application_fee', amount: 19.99 }],
    });
    assert.deepEqual(validatePartnerPayment(payment, order, '987'), { refunded: 0 });
    assert.throws(() => validatePartnerPayment({ ...payment, collector_id: '999' }, order, '987'), /não corresponde/);
    assert.throws(() => validatePartnerPayment({ ...payment, application_id: '999' }, order, '987'), /não corresponde/);
    assert.throws(() => validatePartnerPayment({ ...payment, transaction_amount: 199.89 }, order, '987'), /não corresponde/);
    assert.throws(() => validatePartnerPayment({ ...payment, live_mode: true }, order, '987'), /não corresponde/);
    assert.throws(() => validatePartnerPayment({ ...payment, fee_details: [] }, order, '987'), /Comissão não confirmada/);
    assert.throws(() => validatePartnerPayment({ ...payment, status: 'refunded' }, order, '987'), /Estorno total/);
    assert.deepEqual(validatePartnerPayment({ ...payment, status: 'refunded', transaction_amount_refunded: 199.9 }, order, '987'), { refunded: 19990 });
    const preference = partnerPreference(order);
    assert.equal(preference.items[0].unit_price, 199.9);
    assert.equal(preference.marketplace_fee, 19.99);
    assert.equal(preference.external_reference, order.id);
    assert.match(preference.back_urls.success, /token=/);
  });
});
