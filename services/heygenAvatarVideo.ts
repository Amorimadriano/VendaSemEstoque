export type HeyGenVideoStatus = 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type HeyGenStatusResult = {
  status: HeyGenVideoStatus;
  videoUrl?: string;
  error?: string;
};

type HeyGenApiResponse = {
  data?: {
    video_id?: string;
    status?: string;
    video_url?: string;
    error?: string | { message?: string };
  };
  error?: string | { message?: string };
};

type HeyGenFetch = typeof fetch;
export type HeyGenCharacterType = 'avatar' | 'talking_photo';

export function resolveHeyGenCharacter(env: {
  [key: string]: string | undefined;
  HEYGEN_CHARACTER_TYPE?: string;
  HEYGEN_AVATAR_ID?: string;
  HEYGEN_TALKING_PHOTO_ID?: string;
}): { avatarId: string; characterType: HeyGenCharacterType } {
  const photoId = env.HEYGEN_TALKING_PHOTO_ID?.trim();
  const characterType = env.HEYGEN_CHARACTER_TYPE?.trim() || (photoId ? 'talking_photo' : 'avatar');
  if (characterType !== 'avatar' && characterType !== 'talking_photo') {
    throw new Error('HEYGEN_CHARACTER_TYPE deve ser avatar ou talking_photo.');
  }
  const variable = characterType === 'avatar' ? 'HEYGEN_AVATAR_ID' : 'HEYGEN_TALKING_PHOTO_ID';
  const avatarId = env[variable]?.trim();
  if (!avatarId) throw new Error(`Configure ${variable} com um ID acessivel pela HEYGEN_API_KEY para o tipo ${characterType}.`);
  return { avatarId, characterType };
}

function getErrorMessage(error: unknown) {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message;
  return 'A HeyGen API retornou um erro sem mensagem.';
}

export function buildAvatarScript(content: {
  script?: string | null;
  hook?: string | null;
  caption?: string | null;
  cta?: string | null;
  productName: string;
}): string {
  const script = content.script?.trim();
  const text = script || [content.hook, `Hoje eu quero mostrar ${content.productName}.`, content.caption, content.cta]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join('\n\n');
  if (!text) throw new Error('Adicione um roteiro ou texto de apresentação antes de gerar o avatar.');
  return text.slice(0, 1500);
}

export async function createHeyGenAvatarVideo(options: {
  apiKey: string;
  avatarId: string;
  characterType?: HeyGenCharacterType;
  voiceId: string;
  script: string;
  fetcher?: HeyGenFetch;
}): Promise<string> {
  const characterType = options.characterType || 'avatar';
  const character = characterType === 'talking_photo'
    ? { type: 'talking_photo', talking_photo_id: options.avatarId }
    : { type: 'avatar', avatar_id: options.avatarId, avatar_style: 'normal' };

  const response = await (options.fetcher || fetch)('https://api.heygen.com/v2/video/generate', {
    method: 'POST',
    headers: {
      'X-Api-Key': options.apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      video_inputs: [{
        character,
        voice: {
          type: 'text',
          input_text: options.script,
          voice_id: options.voiceId,
          speed: 1,
        },
      }],
      dimension: { width: 1080, height: 1920 },
    }),
  });

  const result = await response.json().catch(() => ({})) as HeyGenApiResponse;
  if (!response.ok) throw new Error(getErrorMessage(result.error || result.data?.error));
  const videoId = result.data?.video_id;
  if (!videoId) throw new Error('A HeyGen API não retornou o ID do render.');
  return videoId;
}

export async function getHeyGenAvatarVideoStatus(options: {
  apiKey: string;
  videoId: string;
  fetcher?: HeyGenFetch;
}): Promise<HeyGenStatusResult> {
  const statusUrl = new URL('https://api.heygen.com/v1/video_status.get');
  statusUrl.searchParams.set('video_id', options.videoId);
  const response = await (options.fetcher || fetch)(statusUrl, {
    headers: {
      'X-Api-Key': options.apiKey,
      Accept: 'application/json',
    },
  });
  const result = await response.json().catch(() => ({})) as HeyGenApiResponse;
  if (!response.ok) {
    const message = getErrorMessage(result.error || result.data?.error);
    if (response.status === 429 || response.status >= 500) {
      throw new Error(`HeyGen temporariamente indisponível (HTTP ${response.status}): ${message}`);
    }
    return { status: 'FAILED', error: `HeyGen recusou a solicitação (HTTP ${response.status}): ${message}` };
  }

  const status = String(result.data?.status || '').toLowerCase();
  if (status === 'completed' || status === 'success') {
    return result.data?.video_url
      ? { status: 'COMPLETED', videoUrl: result.data.video_url }
      : { status: 'FAILED', error: 'HeyGen marcou o vídeo como concluído, mas não retornou a URL.' };
  }
  if (status === 'failed' || status === 'error') {
    return { status: 'FAILED', error: getErrorMessage(result.data?.error) };
  }
  return { status: 'PROCESSING' };
}