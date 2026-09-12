import assert from 'node:assert/strict';
import test from 'node:test';
import { buildWeeklyCampaignPlan } from '../services/weeklyCampaignAutomation';

test('buildWeeklyCampaignPlan creates a full 7-day multi-channel funnel calendar', () => {
  const plan = buildWeeklyCampaignPlan({
    id: 'prod-123',
    name: 'Air Fryer Digital 5L',
    brand: 'Philips',
    description: 'Fritadeira sem óleo com painel digital touch.',
    price: 499.9,
    key_benefits: 'Cozinha sem óleo, 8 programas pré-definidos e cesto antiaderente.',
    key_objections: 'Consumo de energia, tamanho da bancada e facilidade de limpeza.',
    marketplace: { name: 'Mercado Livre' },
  });

  assert.equal(plan.productId, 'prod-123');
  assert.equal(plan.calendar.length, 7);

  const days = plan.calendar.map((c) => c.dayOfWeek);
  assert.ok(days.includes('Segunda-feira'));
  assert.ok(days.includes('Terça-feira'));
  assert.ok(days.includes('Quarta-feira'));
  assert.ok(days.includes('Quinta-feira'));
  assert.ok(days.includes('Sexta-feira'));
  assert.ok(days.includes('Sábado'));
  assert.ok(days.includes('Domingo'));

  // Valida que há alternância de canais e formatos
  const channels = new Set(plan.calendar.map((c) => c.channel));
  assert.ok(channels.has('instagram'));
  assert.ok(channels.has('facebook'));

  const contentTypes = new Set(plan.calendar.map((c) => c.contentType));
  assert.ok(contentTypes.has('REEL'));
  assert.ok(contentTypes.has('POST'));
  assert.ok(contentTypes.has('CAROUSEL'));

  // Valida conteúdo personalizado por produto
  const monday = plan.calendar.find((c) => c.dayOfWeek === 'Segunda-feira');
  assert.ok(monday?.hook.includes('Air Fryer Digital 5L'));
  assert.ok(monday?.caption.includes('Mercado Livre'));
});
