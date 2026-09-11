import assert from 'node:assert/strict';
import test from 'node:test';
import { validateProductQuality } from '../lib/productQuality';

test('accepts a complete active affiliate product', () => {
  const result = validateProductQuality({
    name: 'Produto completo para teste',
    description: 'Descrição completa com informações suficientes para publicação.',
    image_url: 'https://example.com/product.jpg',
    affiliate_url: 'https://example.com/offer?id=1',
    price: 99.9,
    status: 'ACTIVE',
  });
  assert.equal(result.valid, true);
});

test('rejects products with unsafe publication data', () => {
  const result = validateProductQuality({ name: 'Curto', description: '', image_url: 'http://invalid', affiliate_url: '', price: 0, status: 'INACTIVE' });
  assert.equal(result.valid, false);
  assert.ok(result.errors.length >= 5);
});