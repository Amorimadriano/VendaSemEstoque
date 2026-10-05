import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildAvatarScript,
  createHeyGenAvatarVideo,
  getHeyGenAvatarVideoStatus,
  resolveHeyGenCharacter,
} from '../services/heygenAvatarVideo';

test('accepts Node.js ProcessEnv without a type assertion', () => {
  const env: NodeJS.ProcessEnv = { NODE_ENV: 'test', HEYGEN_AVATAR_ID: 'avatar-123' };
  assert.deepEqual(resolveHeyGenCharacter(env), {
    avatarId: 'avatar-123', characterType: 'avatar',
  });
});

test('resolves the ID for the explicit character type without mixing avatar and photo IDs', () => {
  const env = { HEYGEN_AVATAR_ID: ' avatar-123 ', HEYGEN_TALKING_PHOTO_ID: 'photo-456' };
  assert.deepEqual(resolveHeyGenCharacter({ ...env, HEYGEN_CHARACTER_TYPE: 'avatar' }), {
    avatarId: 'avatar-123', characterType: 'avatar',
  });
  assert.deepEqual(resolveHeyGenCharacter({ ...env, HEYGEN_CHARACTER_TYPE: 'talking_photo' }), {
    avatarId: 'photo-456', characterType: 'talking_photo',
  });
});

test('infers the character type from configured IDs when no explicit type is set', () => {
  assert.deepEqual(resolveHeyGenCharacter({ HEYGEN_AVATAR_ID: 'avatar-123' }), {
    avatarId: 'avatar-123', characterType: 'avatar',
  });
  assert.deepEqual(resolveHeyGenCharacter({ HEYGEN_TALKING_PHOTO_ID: 'photo-456', HEYGEN_CHARACTER_TYPE: '' }), {
    avatarId: 'photo-456', characterType: 'talking_photo',
  });
});

test('rejects missing IDs for the chosen type and unsupported character types', () => {
  assert.throws(() => resolveHeyGenCharacter({ HEYGEN_CHARACTER_TYPE: 'avatar', HEYGEN_TALKING_PHOTO_ID: 'photo-456' }), /Configure HEYGEN_AVATAR_ID/);
  assert.throws(() => resolveHeyGenCharacter({ HEYGEN_CHARACTER_TYPE: 'talking_photo', HEYGEN_AVATAR_ID: 'avatar-123' }), /Configure HEYGEN_TALKING_PHOTO_ID/);
  assert.throws(() => resolveHeyGenCharacter({ HEYGEN_CHARACTER_TYPE: 'invalid' }), /deve ser avatar ou talking_photo/);
});

test('buildAvatarScript prefers the approved script and caps its length', () => {
  assert.equal(buildAvatarScript({ script: '  Olá, veja este produto.  ', productName: 'Produto' }), 'Olá, veja este produto.');
  assert.equal(buildAvatarScript({ script: 'x'.repeat(1600), productName: 'Produto' }).length, 1500);
});

test('buildAvatarScript assembles a spoken pitch when no script was supplied', () => {
  assert.equal(
    buildAvatarScript({ hook: 'Uma novidade', caption: 'Boa qualidade', cta: 'Confira agora', productName: 'Fone Bluetooth' }),
    'Uma novidade\n\nHoje eu quero mostrar Fone Bluetooth.\n\nBoa qualidade\n\nConfira agora'
  );
});

test('creates a portrait HeyGen render using the configured avatar and voice', async () => {
  let requestUrl = '';
  let requestInit: RequestInit | undefined;
  const videoId = await createHeyGenAvatarVideo({
    apiKey: 'test-key',
    avatarId: 'avatar-123',
    voiceId: 'voice-456',
    script: 'Conheça este produto.',
    fetcher: async (input, init) => {
      requestUrl = String(input);
      requestInit = init;
      return Response.json({ data: { video_id: 'render-789' } });
    },
  });

  const body = JSON.parse(String(requestInit?.body));
  assert.equal(videoId, 'render-789');
  assert.equal(requestUrl, 'https://api.heygen.com/v2/video/generate');
  assert.equal((requestInit?.headers as Record<string, string>)['X-Api-Key'], 'test-key');
  assert.equal(body.video_inputs[0].character.avatar_id, 'avatar-123');
  assert.equal(body.video_inputs[0].voice.voice_id, 'voice-456');
  assert.deepEqual(body.dimension, { width: 1080, height: 1920 });
});

test('uses the talking photo ID field for a HeyGen talking photo', async () => {
  let requestInit: RequestInit | undefined;
  await createHeyGenAvatarVideo({
    apiKey: 'test-key',
    avatarId: 'talking-photo-123',
    characterType: 'talking_photo',
    voiceId: 'voice-456',
    script: 'Conheça este produto.',
    fetcher: async (_input, init) => {
      requestInit = init;
      return Response.json({ data: { video_id: 'render-789' } });
    },
  });

  const body = JSON.parse(String(requestInit?.body));
  assert.deepEqual(body.video_inputs[0].character, {
    type: 'talking_photo',
    talking_photo_id: 'talking-photo-123',
  });
});

test('reads completed HeyGen renders and returns their video URL', async () => {
  const result = await getHeyGenAvatarVideoStatus({
    apiKey: 'test-key',
    videoId: 'render-789',
    fetcher: async (input) => {
      assert.equal(new URL(String(input)).searchParams.get('video_id'), 'render-789');
      return Response.json({ data: { status: 'completed', video_url: 'https://cdn.example.com/avatar.mp4' } });
    },
  });

  assert.deepEqual(result, { status: 'COMPLETED', videoUrl: 'https://cdn.example.com/avatar.mp4' });
});

test('keeps in-progress and failed HeyGen render states explicit', async () => {
  const processing = await getHeyGenAvatarVideoStatus({
    apiKey: 'test-key',
    videoId: 'pending',
    fetcher: async () => Response.json({ data: { status: 'processing' } }),
  });
  const failed = await getHeyGenAvatarVideoStatus({
    apiKey: 'test-key',
    videoId: 'failed',
    fetcher: async () => Response.json({ data: { status: 'failed', error: 'Avatar render failed' } }),
  });

  assert.deepEqual(processing, { status: 'PROCESSING' });
  assert.deepEqual(failed, { status: 'FAILED', error: 'Avatar render failed' });
});

test('treats HeyGen authorization errors as permanent and server errors as retryable', async () => {
  const unauthorized = await getHeyGenAvatarVideoStatus({
    apiKey: 'test-key',
    videoId: 'unauthorized',
    fetcher: async () => Response.json({ error: { message: 'Invalid API key' } }, { status: 401 }),
  });
  await assert.rejects(
    getHeyGenAvatarVideoStatus({
      apiKey: 'test-key',
      videoId: 'busy',
      fetcher: async () => Response.json({ error: { message: 'Temporary outage' } }, { status: 503 }),
    }),
    /temporariamente indisponível \(HTTP 503\)/
  );

  assert.deepEqual(unauthorized, { status: 'FAILED', error: 'HeyGen recusou a solicitação (HTTP 401): Invalid API key' });
});