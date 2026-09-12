import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import { getSupabase } from '@/lib/supabase';

if (ffmpegInstaller?.path) {
  ffmpeg.setFfmpegPath(ffmpegInstaller.path);
}
if (ffprobeInstaller?.path) {
  ffmpeg.setFfprobePath(ffprobeInstaller.path);
}

export interface FfmpegVideoOptions {
  durationSeconds?: number;
  width?: number;
  height?: number;
}

function escapeFfmpegText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/%/g, '\\%')
    .replace(/;/g, '\\;')
    .replace(/\n/g, ' ');
}

function wrapTextLines(text: string, maxLineLength = 32, maxLines = 4): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxLineLength) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
      if (lines.length >= maxLines) break;
    }
  }
  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }
  return lines;
}

export async function generateLocalProductVideo(
  product: {
    name: string;
    image_url?: string | null;
    brand?: string | null;
    key_benefits?: string | null;
    marketplace?: { name?: string | null } | null;
  },
  content: {
    hook: string;
    caption: string;
    cta: string;
  },
  options: FfmpegVideoOptions = {}
): Promise<{ buffer: Buffer; filePath: string }> {
  if (!product.image_url || !product.image_url.startsWith('http')) {
    throw new Error('O produto necessita de uma URL pública de imagem para gerar o vídeo com FFmpeg.');
  }

  const duration = options.durationSeconds || 10;
  const width = options.width || 1080;
  const height = options.height || 1920;

  const tmpDir = path.join(os.tmpdir(), `vse-video-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  const inputImagePath = path.join(tmpDir, 'product_image.jpg');
  const outputVideoPath = path.join(tmpDir, 'output.mp4');

  // 1. Download da imagem do produto
  const imgResponse = await fetch(product.image_url);
  if (!imgResponse.ok) {
    throw new Error(`Falha ao baixar imagem do produto (${imgResponse.status}): ${product.image_url}`);
  }
  const imgArrayBuffer = await imgResponse.arrayBuffer();
  fs.writeFileSync(inputImagePath, Buffer.from(imgArrayBuffer));

  const marketName = escapeFfmpegText(product.marketplace?.name || 'OFERTA SELECIONADA').toUpperCase();
  const titleLines = wrapTextLines(product.name, 28, 2);
  const hookLines = wrapTextLines(content.hook, 32, 2);
  const benefitLines = wrapTextLines(product.key_benefits || content.caption, 36, 3);
  const ctaText = escapeFfmpegText(content.cta || 'CONFIRA DETALHES NA LOJA PARCEIRA');

  // Construir filtros de sobreposição de texto
  const drawTextFilters: string[] = [];

  // 1. Badge superior com nome do marketplace
  drawTextFilters.push(
    `drawtext=text='${marketName}':fontcolor=white:fontsize=42:x=(w-text_w)/2:y=120:box=1:boxcolor=0x1E3A8Acc:boxborderw=18`
  );

  // 2. Título do produto
  titleLines.forEach((line, idx) => {
    const escaped = escapeFfmpegText(line);
    const yPos = 240 + idx * 56;
    drawTextFilters.push(
      `drawtext=text='${escaped}':fontcolor=0x111827:fontsize=48:x=(w-text_w)/2:y=${yPos}:box=1:boxcolor=0xFFFFFFee:boxborderw=12`
    );
  });

  // 3. Gancho / Destaque de benefício
  hookLines.forEach((line, idx) => {
    const escaped = escapeFfmpegText(line);
    const yPos = 1380 + idx * 54;
    drawTextFilters.push(
      `drawtext=text='${escaped}':fontcolor=0x0F766E:fontsize=44:x=(w-text_w)/2:y=${yPos}:box=1:boxcolor=0xF0FDFAee:boxborderw=14`
    );
  });

  // 4. Benefícios
  benefitLines.forEach((line, idx) => {
    const escaped = escapeFfmpegText(line);
    const yPos = 1530 + idx * 46;
    drawTextFilters.push(
      `drawtext=text='${escaped}':fontcolor=0x374151:fontsize=36:x=(w-text_w)/2:y=${yPos}:box=1:boxcolor=0xFFFFFFee:boxborderw=10`
    );
  });

  // 5. CTA inferior com fundo destacado
  drawTextFilters.push(
    `drawtext=text='${ctaText}':fontcolor=white:fontsize=40:x=(w-text_w)/2:y=1760:box=1:boxcolor=0x16A34Acc:boxborderw=20`
  );

  // Filtro complexo:
  // - Cria fundo colorido elegante
  // - Enquadra e aplica leve zoom na imagem do produto
  // - Aplica todas as sobreposições de texto
  const filterComplex = [
    `[0:v]scale=900:900:force_original_aspect_ratio=decrease,pad=900:900:(ow-iw)/2:(oh-ih)/2:color=0xFFFFFF00[img]`,
    `color=c=0xF3F4F6:s=${width}x${height}:d=${duration}[bg]`,
    `[bg][img]overlay=x=(W-w)/2:y=420[composite]`,
    `[composite]${drawTextFilters.join(',')},format=yuv420p[outv]`,
  ].join(';');

  await new Promise<void>((resolve, reject) => {
    ffmpeg()
      .input(inputImagePath)
      .loop(duration)
      .complexFilter(filterComplex)
      .outputOptions([
        '-map [outv]',
        '-c:v libx264',
        '-tune stillimage',
        '-pix_fmt yuv420p',
        '-movflags +faststart',
        '-r 30',
        `-t ${duration}`,
      ])
      .output(outputVideoPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(new Error(`Erro no FFmpeg: ${err.message}`)))
      .run();
  });

  const videoBuffer = fs.readFileSync(outputVideoPath);

  // Limpeza dos arquivos temporários
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    // ignora erros na limpeza de temp
  }

  return { buffer: videoBuffer, filePath: outputVideoPath };
}

export async function createFfmpegProductVideoAndUpload(contentId: string): Promise<{ videoUrl: string; status: string; videoId: string }> {
  const supabase = getSupabase();

  const { data: content, error: contentErr } = await supabase
    .from('marketing_content')
    .select('id, hook, caption, cta, product:products(name, brand, image_url, key_benefits, marketplace:marketplaces(name))')
    .eq('id', contentId)
    .single();

  if (contentErr || !content) {
    throw new Error(contentErr?.message || 'Conteúdo não encontrado para geração do vídeo.');
  }

  const product = content.product as any;
  if (!product?.image_url) {
    throw new Error('O produto precisa de imagem pública para renderizar o Reel.');
  }

  // 1. Gera o vídeo MP4 localmente de graça com FFmpeg
  const { buffer } = await generateLocalProductVideo(product, {
    hook: content.hook,
    caption: content.caption,
    cta: content.cta,
  });

  // 2. Faz o upload do MP4 para o bucket 'videos' no Supabase Storage
  const fileName = `reels/${contentId}-${Date.now()}.mp4`;
  const { data: uploadData, error: uploadErr } = await supabase.storage
    .from('videos')
    .upload(fileName, buffer, {
      contentType: 'video/mp4',
      upsert: true,
    });

  if (uploadErr) {
    throw new Error(`Erro ao salvar vídeo no Storage: ${uploadErr.message}`);
  }

  const { data: publicUrlData } = supabase.storage.from('videos').getPublicUrl(uploadData.path);
  const videoUrl = publicUrlData.publicUrl;

  // 3. Atualiza / insere registro em marketing_videos
  const videoId = crypto.randomUUID();
  const now = new Date().toISOString();

  const { data: existingVid } = await supabase
    .from('marketing_videos')
    .select('id')
    .eq('content_id', contentId)
    .maybeSingle();

  if (existingVid) {
    await supabase
      .from('marketing_videos')
      .update({
        status: 'SUCCEEDED',
        video_url: videoUrl,
        provider_render_id: `ffmpeg_${contentId}`,
        updated_at: now,
      })
      .eq('id', existingVid.id);
  } else {
    await supabase.from('marketing_videos').insert({
      id: videoId,
      content_id: contentId,
      provider_render_id: `ffmpeg_${contentId}`,
      status: 'SUCCEEDED',
      video_url: videoUrl,
      created_at: now,
      updated_at: now,
    });
  }

  return {
    videoId,
    videoUrl,
    status: 'SUCCEEDED',
  };
}
