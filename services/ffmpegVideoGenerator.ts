import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import { getSupabase } from '@/lib/supabase';
import { buildAvatarScript, createHeyGenAvatarVideo, getHeyGenAvatarVideoStatus } from './heygenAvatarVideo';

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

export async function generateLocalAvatarProductVideo(
  avatarVideoUrl: string,
  product: {
    name: string;
    image_url?: string | null;
    marketplace?: { name?: string | null } | null;
  },
  content: { hook: string; cta: string },
  fetcher: typeof fetch = fetch
): Promise<Buffer> {
  if (!avatarVideoUrl.startsWith('https://')) throw new Error('A URL do avatar precisa usar HTTPS.');
  if (!product.image_url || !product.image_url.startsWith('https://')) {
    throw new Error('O produto precisa de uma imagem pública HTTPS para compor o Reel.');
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vse-avatar-reel-'));
  const avatarPath = path.join(tmpDir, 'avatar.mp4');
  const productImagePath = path.join(tmpDir, 'product-image');
  const outputPath = path.join(tmpDir, 'final-reel.mp4');

  try {
    const [avatarResponse, imageResponse] = await Promise.all([
      fetcher(avatarVideoUrl),
      fetcher(product.image_url),
    ]);
    if (!avatarResponse.ok) throw new Error(`Falha ao baixar o avatar HeyGen (${avatarResponse.status}).`);
    if (!imageResponse.ok) throw new Error(`Falha ao baixar a imagem do produto (${imageResponse.status}).`);

    const avatarBytes = Buffer.from(await avatarResponse.arrayBuffer());
    const imageBytes = Buffer.from(await imageResponse.arrayBuffer());
    const maxVideoBytes = 250 * 1024 * 1024;
    if (avatarBytes.length === 0 || avatarBytes.length > maxVideoBytes) throw new Error('O vídeo do avatar está vazio ou excede 250 MB.');
    if (imageBytes.length === 0 || imageBytes.length > 20 * 1024 * 1024) throw new Error('A imagem do produto está vazia ou excede 20 MB.');
    fs.writeFileSync(avatarPath, avatarBytes);
    fs.writeFileSync(productImagePath, imageBytes);

    const marketName = escapeFfmpegText(product.marketplace?.name || 'OFERTA').toUpperCase();
    const titleLines = wrapTextLines(product.name, 23, 2);
    const hookLines = wrapTextLines(content.hook, 25, 2);
    const cta = escapeFfmpegText(content.cta || 'Confira os detalhes na loja parceira.');
    const textFilters = [
      `drawtext=text='${marketName}':fontcolor=white:fontsize=28:x=380:y=1495:box=1:boxcolor=0x1E3A8Acc:boxborderw=10`,
      ...titleLines.map((line, index) => `drawtext=text='${escapeFfmpegText(line)}':fontcolor=white:fontsize=34:x=380:y=${1540 + index * 42}:box=1:boxcolor=0x111827cc:boxborderw=8`),
      ...hookLines.map((line, index) => `drawtext=text='${escapeFfmpegText(line)}':fontcolor=0xA7F3D0:fontsize=30:x=380:y=${1635 + index * 40}:box=1:boxcolor=0x111827cc:boxborderw=8`),
      `drawtext=text='${cta}':fontcolor=white:fontsize=28:x=380:y=1765:box=1:boxcolor=0x16A34Acc:boxborderw=12`,
    ];
    const filterComplex = [
      '[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[avatar]',
      '[1:v]scale=300:300:force_original_aspect_ratio=decrease,pad=300:300:(ow-iw)/2:(oh-ih)/2:color=white,format=rgba[product]',
      '[avatar]drawbox=x=0:y=1450:w=1080:h=470:color=0x111827cc:t=fill[base]',
      '[base][product]overlay=x=40:y=1510:eof_action=repeat[withproduct]',
      `[withproduct]${textFilters.join(',')},format=yuv420p[outv]`,
    ].join(';');

    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(avatarPath)
        .input(productImagePath)
        .complexFilter(filterComplex)
        .outputOptions([
          '-map [outv]',
          '-map 0:a?',
          '-c:v libx264',
          '-c:a aac',
          '-b:a 128k',
          '-pix_fmt yuv420p',
          '-movflags +faststart',
          '-r 30',
          '-shortest',
        ])
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (error) => reject(new Error(`Erro ao compor o avatar com FFmpeg: ${error.message}`)))
        .run();
    });

    return fs.readFileSync(outputPath);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

export async function renderAvatarProductVideoAndUpload(
  contentId: string,
  videoRecordId: string,
  avatarVideoUrl: string
): Promise<{ videoUrl: string; status: string }> {
  const supabase = getSupabase();
  const { data: content, error: contentError } = await supabase
    .from('marketing_content')
    .select('id,hook,cta,product:products(name,image_url,marketplace:marketplaces(name))')
    .eq('id', contentId)
    .single();
  if (contentError || !content) throw new Error(contentError?.message || 'Conteúdo não encontrado para compor o avatar.');

  const product = content.product as { name?: string; image_url?: string; marketplace?: { name?: string } } | null;
  const productName = product?.name;
  const productImageUrl = product?.image_url;
  if (!product || !productName || !productImageUrl) throw new Error('O produto precisa de nome e imagem pública para compor o Reel.');

  const buffer = await generateLocalAvatarProductVideo(avatarVideoUrl, {
    name: productName,
    image_url: productImageUrl,
    marketplace: product.marketplace,
  }, { hook: content.hook, cta: content.cta });
  const storagePath = `reels/${contentId}-avatar-${Date.now()}.mp4`;
  const { data: upload, error: uploadError } = await supabase.storage.from('videos').upload(storagePath, buffer, {
    contentType: 'video/mp4',
    upsert: true,
  });
  if (uploadError || !upload) throw new Error(uploadError?.message || 'Falha ao enviar o Reel composto para o Storage.');

  const { data: publicUrl } = supabase.storage.from('videos').getPublicUrl(upload.path);
  const videoUrl = publicUrl.publicUrl;
  const { error: updateError } = await supabase.from('marketing_videos').update({
    status: 'SUCCEEDED',
    video_url: videoUrl,
    error: null,
    updated_at: new Date().toISOString(),
  }).eq('id', videoRecordId);
  if (updateError) throw updateError;

  return { videoUrl, status: 'SUCCEEDED' };
}

export async function createHeyGenAvatarProductVideoAndUpload(contentId: string): Promise<{ videoUrl: string; status: string; videoId: string }> {
  const apiKey = process.env.HEYGEN_API_KEY;
  const avatarId = process.env.HEYGEN_TALKING_PHOTO_ID || process.env.HEYGEN_AVATAR_ID;
  const voiceId = process.env.HEYGEN_VOICE_ID;
  const characterType = process.env.HEYGEN_CHARACTER_TYPE || 'talking_photo';
  if (!apiKey || !avatarId || !voiceId || !['avatar', 'talking_photo'].includes(characterType)) {
    throw new Error('Configure HEYGEN_API_KEY, HEYGEN_AVATAR_ID (ou HEYGEN_TALKING_PHOTO_ID) e HEYGEN_VOICE_ID nos secrets do workflow.');
  }

  const supabase = getSupabase();
  const { data: content, error: contentError } = await supabase
    .from('marketing_content')
    .select('id,script,hook,caption,cta,product:products(name,image_url,marketplace:marketplaces(name))')
    .eq('id', contentId)
    .single();
  if (contentError || !content) throw new Error(contentError?.message || 'Conteúdo não encontrado para gerar o Reel com avatar.');

  const product = content.product as { name?: string; image_url?: string; marketplace?: { name?: string } } | null;
  const productName = product?.name;
  if (!product || !productName || !product.image_url) throw new Error('O produto precisa de nome e imagem pública para gerar o Reel.');

  const { data: previousVideo, error: previousVideoError } = await supabase
    .from('marketing_videos')
    .select('id,provider_render_id,status,video_url')
    .eq('content_id', contentId)
    .like('provider_render_id', 'heygen:%')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (previousVideoError) throw previousVideoError;

  if (previousVideo && ['SUCCEEDED', 'FINISHED', 'COMPLETED'].includes(String(previousVideo.status).toUpperCase()) && previousVideo.video_url) {
    return { videoUrl: previousVideo.video_url, status: 'SUCCEEDED', videoId: previousVideo.id };
  }

  let videoRecordId = previousVideo?.id;
  let heygenVideoId = previousVideo?.status === 'RENDERING'
    ? String(previousVideo.provider_render_id).slice('heygen:'.length)
    : '';

  if (!heygenVideoId) {
    const script = buildAvatarScript({
      script: content.script,
      hook: content.hook,
      caption: content.caption,
      cta: content.cta,
      productName,
    });
    heygenVideoId = await createHeyGenAvatarVideo({
      apiKey,
      avatarId,
      characterType: characterType as 'avatar' | 'talking_photo',
      voiceId,
      script,
    });
    videoRecordId = crypto.randomUUID();
    const now = new Date().toISOString();
    const { error: insertError } = await supabase.from('marketing_videos').insert({
      id: videoRecordId,
      content_id: contentId,
      provider_render_id: `heygen:${heygenVideoId}`,
      status: 'RENDERING',
      video_url: null,
      error: null,
      created_at: now,
      updated_at: now,
    });
    if (insertError) throw insertError;
  }

  const recordFailure = async (message: string) => {
    if (!videoRecordId) return;
    await supabase.from('marketing_videos').update({
      status: 'FAILED',
      error: message.slice(0, 2000),
      updated_at: new Date().toISOString(),
    }).eq('id', videoRecordId);
  };

  for (let attempt = 0; attempt < 40; attempt += 1) {
    let status;
    try {
      status = await getHeyGenAvatarVideoStatus({ apiKey, videoId: heygenVideoId });
    } catch (error) {
      console.warn(`[HeyGen] Falha temporária ao consultar ${heygenVideoId}:`, error instanceof Error ? error.message : String(error));
      await new Promise((resolve) => setTimeout(resolve, 15_000));
      continue;
    }

    if (status.status === 'FAILED') {
      const message = status.error || 'A HeyGen não conseguiu gerar o avatar.';
      await recordFailure(message);
      throw new Error(message);
    }

    if (status.status === 'COMPLETED' && status.videoUrl && videoRecordId) {
      try {
        const result = await renderAvatarProductVideoAndUpload(contentId, videoRecordId, status.videoUrl);
        return { ...result, videoId: videoRecordId };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await recordFailure(message);
        throw error;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 15_000));
  }

  const timeoutMessage = 'O avatar excedeu o tempo máximo de processamento de 10 minutos.';
  await recordFailure(timeoutMessage);
  throw new Error(timeoutMessage);
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
