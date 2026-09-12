import assert from 'node:assert/strict';
import test from 'node:test';
import { compareAbTestResults, generateAbTestPlan } from '../lib/abTestPlan';

test('generateAbTestPlan creates a strong hook variation set', () => {
  const plan = generateAbTestPlan({
    name: 'Fone Bluetooth X',
    price: 149.9,
    commissionPercentage: 12,
    marketplace: { name: 'Shopee' },
  }, 'Gancho');

  assert.match(plan.hypothesis, /CTR|gancho|clique/i);
  assert.ok(plan.variationA.includes('Fone Bluetooth X'));
  assert.ok(plan.variationB.includes('Fone Bluetooth X'));
  assert.notEqual(plan.variationA, plan.variationB);
});

test('generateAbTestPlan creates an offer test for conversion-focused experiments', () => {
  const plan = generateAbTestPlan({
    name: 'Aspirador Sem Fio',
    price: 299,
    commissionPercentage: 18,
    marketplace: { name: 'Mercado Livre' },
  }, 'Oferta');

  assert.match(plan.hypothesis, /oferta|convers|preço|CTA/i);
  assert.ok(plan.variationA.toLowerCase().includes('oferta') || plan.variationA.includes('R$'));
  assert.ok(plan.variationB.toLowerCase().includes('oferta') || plan.variationB.includes('R$'));
});

test('compareAbTestResults detects the stronger variation from CTR and conversion impact', () => {
  const result = compareAbTestResults(
    { impressions: 1000, clicks: 200, conversions: 18 },
    { impressions: 1000, clicks: 150, conversions: 14 },
  );

  assert.equal(result.winner, 'A');
  assert.ok(result.ctrA > result.ctrB);
  assert.ok(result.recommendation.includes('A variação A'));
});

test('compareAbTestResults recognizes a B winner and exposes a measurable delta', () => {
  const result = compareAbTestResults(
    { impressions: 1000, clicks: 120, conversions: 10 },
    { impressions: 1000, clicks: 180, conversions: 19 },
  );

  assert.equal(result.winner, 'B');
  assert.ok(result.ctrB > result.ctrA);
  assert.ok(result.deltaPct >= 0);
  assert.ok(result.recommendation.includes('A variação B'));
});

test('compareAbTestResults handles tie and edge cases with zero traffic', () => {
  const result = compareAbTestResults(
    { impressions: 0, clicks: 0, conversions: 0 },
    { impressions: 0, clicks: 0, conversions: 0 },
  );

  assert.equal(result.winner, 'Empate');
  assert.equal(result.deltaPct, 0);
  assert.match(result.recommendation, /empatados/i);
});

test('generateAbTestPlan supports all essential marketing variables', () => {
  const variables = ['Gancho', 'Imagem', 'Vídeo', 'Título', 'CTA', 'Oferta', 'Ângulo', 'Formato', 'Público'];
  for (const v of variables) {
    const plan = generateAbTestPlan({
      name: 'Smartwatch Pro',
      price: 199.9,
      commissionPercentage: 10,
      marketplace: { name: 'AliExpress' },
    }, v);
    assert.ok(plan.hypothesis.length > 10);
    assert.ok(plan.variationA.length > 5);
    assert.ok(plan.variationB.length > 5);
  }
});
