import assert from 'node:assert/strict';
import test from 'node:test';
import { generateLocalProductVideo } from '../services/ffmpegVideoGenerator';

test('generateLocalProductVideo successfully renders an MP4 video buffer from product info', async () => {
  const sampleProduct = {
    name: 'Cabo de Programação PLC USB-SC09-FX Série FX',
    brand: 'Eletrônicos',
    image_url: 'https://ae-pic-a1.aliexpress-media.com/kf/Sb41bfac4f976441cb85e41a494b9cdc11.jpg',
    key_benefits: 'Compatibilidade total com a série FX e conexão USB direta.',
    marketplace: { name: 'AliExpress' },
  };

  const sampleContent = {
    hook: 'O que vale conferir antes de escolher este cabo?',
    caption: 'Confira as especificações completas na loja parceira.',
    cta: 'Veja a oferta oficial no link da bio.',
  };

  const { buffer, filePath } = await generateLocalProductVideo(sampleProduct, sampleContent, {
    durationSeconds: 2,
    width: 720,
    height: 1280,
  });

  assert.ok(buffer.length > 1000);
  assert.ok(filePath.endsWith('.mp4'));
});
