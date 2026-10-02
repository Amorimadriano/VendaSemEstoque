import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import ffmpeg from 'fluent-ffmpeg';
import { generateLocalAvatarProductVideo, generateLocalProductVideo } from '../services/ffmpegVideoGenerator';

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

test('generateLocalAvatarProductVideo overlays product details on a talking-avatar MP4', async () => {
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'vse-avatar-test-'));
  const avatarPath = path.join(tempDirectory, 'avatar.mp4');
  const imagePath = path.join(tempDirectory, 'product.png');

  try {
    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input('color=c=0x334155:s=360x640:r=24:d=1')
        .inputFormat('lavfi')
        .outputOptions(['-c:v libx264', '-pix_fmt yuv420p', '-movflags +faststart'])
        .output(avatarPath)
        .on('end', () => resolve())
        .on('error', reject)
        .run();
    });
    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input('color=c=0x22C55E:s=320x320:d=1')
        .inputFormat('lavfi')
        .outputOptions(['-frames:v 1'])
        .output(imagePath)
        .on('end', () => resolve())
        .on('error', reject)
        .run();
    });

    const avatarBuffer = fs.readFileSync(avatarPath);
    const imageBuffer = fs.readFileSync(imagePath);
    const result = await generateLocalAvatarProductVideo(
      'https://video.example.test/avatar.mp4',
      { name: 'Fone Bluetooth', image_url: 'https://images.example.test/product.png', marketplace: { name: 'AliExpress' } },
      { hook: 'Som para o dia a dia', cta: 'Confira na loja parceira' },
      async (input) => new Response(String(input).includes('avatar.mp4') ? avatarBuffer : imageBuffer)
    );

    assert.ok(result.length > 1000);
    assert.equal(result.subarray(4, 8).toString(), 'ftyp');
  } finally {
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  }
});
