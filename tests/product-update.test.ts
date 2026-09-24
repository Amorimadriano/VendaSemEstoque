import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeProductInput } from '../lib/productUpdate';

test('normalizes product payload for edit and create flows', () => {
  const normalized = normalizeProductInput({
    name: 'Produto teste',
    price: '129.90',
    cost: '29.90',
    commissionPercentage: '10',
    oldPrice: '',
    marketplaceId: 'market-1',
    categoryId: 'cat-1',
    status: 'ACTIVE',
  });

  assert.equal(normalized.name, 'Produto teste');
  assert.equal(Number(normalized.price), 129.9);
  assert.equal(Number(normalized.cost), 29.9);
  assert.equal(Number(normalized.commissionPercentage), 10);
  assert.equal(normalized.oldPrice, null);
  assert.equal(normalized.status, 'ACTIVE');
});

test('converts empty strings to null on update payload', () => {
  const normalized = normalizeProductInput({
    imageUrl: '',
    supplierInfo: '  ' ,
    keyBenefits: 'Sem custo',
    returnPolicy: '',
  });

  assert.equal(normalized.imageUrl, null);
  assert.equal(normalized.supplierInfo, null);
  assert.equal(normalized.keyBenefits, 'Sem custo');
  assert.equal(normalized.returnPolicy, null);
});
