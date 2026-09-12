import { generateLocalProductVideo } from '../services/ffmpegVideoGenerator';
import fs from 'node:fs';

async function main() {
  console.log('=== TESTANDO GERAÇÃO DE VÍDEO LOCAL COM FFMPEG ===');

  const sampleProduct = {
    name: 'Cabo de Programação PLC USB-SC09-FX Série FX para Componentes Eletrônicos',
    brand: 'Eletrônicos',
    image_url: 'https://ae-pic-a1.aliexpress-media.com/kf/Sb41bfac4f976441cb85e41a494b9cdc11.jpg',
    key_benefits: 'Compatibilidade com série FX, conexão USB direta e alta estabilidade.',
    marketplace: { name: 'AliExpress' },
  };

  const sampleContent = {
    hook: 'O que vale conferir antes de escolher este fone?',
    caption: 'Confira as especificações completas e o preço promocional na loja parceira antes de decidir.',
    cta: 'Veja a oferta oficial no link da bio.',
  };

  const start = Date.now();
  console.log('Gerando vídeo MP4 1080x1920 vertical...');
  const { buffer } = await generateLocalProductVideo(sampleProduct, sampleContent, { durationSeconds: 5 });
  const duration = ((Date.now() - start) / 1000).toFixed(1);

  console.log(`✅ Vídeo gerado com sucesso em ${duration}s!`);
  console.log(`Tamanho do arquivo: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
}

main().catch((err) => {
  console.error('Erro:', err);
  process.exitCode = 1;
});
