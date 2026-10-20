export const INSTAGRAM_PROFILE_STATUSES = [
  'PENDING_REVIEW',
  'FOLLOWED_MANUALLY',
  'SKIPPED',
] as const;

export type InstagramProfileStatus = (typeof INSTAGRAM_PROFILE_STATUSES)[number];

export type InstagramHashtagPost = {
  id: string;
  permalink: string;
  caption?: string;
  mediaType?: string;
  timestamp?: string;
};

const RESERVED_USERNAMES = new Set([
  'about',
  'accounts',
  'api',
  'developer',
  'direct',
  'explore',
  'legal',
  'p',
  'reel',
  'reels',
  'stories',
]);

export function normalizeInstagramProfile(input: string): { username: string; profileUrl: string } | null {
  const value = input.trim();
  if (!value) return null;

  let username = value;
  const profileUrlInput = /^(?:https?:\/\/)?(?:www\.)?instagram\.com\//i.test(value);
  if (profileUrlInput) {
    try {
      const url = new URL(value.startsWith('http') ? value : `https://${value}`);
      if (!['instagram.com', 'www.instagram.com'].includes(url.hostname.toLowerCase())) return null;
      const segments = url.pathname.split('/').filter(Boolean);
      if (segments.length !== 1) return null;
      username = segments[0];
    } catch {
      return null;
    }
  } else if (username.startsWith('@')) {
    username = username.slice(1);
  }

  username = username.toLowerCase();
  if (!/^[a-z0-9._]{1,30}$/.test(username) || RESERVED_USERNAMES.has(username)) return null;

  return {
    username,
    profileUrl: `https://www.instagram.com/${username}/`,
  };
}

export function isInstagramProfileStatus(value: unknown): value is InstagramProfileStatus {
  return typeof value === 'string' && INSTAGRAM_PROFILE_STATUSES.includes(value as InstagramProfileStatus);
}

export function normalizeInstagramHashtag(input: string): string | null {
  const hashtag = input.trim().replace(/^#/, '').normalize('NFKC').toLowerCase();
  if (!hashtag || hashtag.length > 30 || !/^[\p{L}\p{N}_]+$/u.test(hashtag)) return null;
  return hashtag;
}

// Meta's hashtag endpoints never expose the author's username, so only post links can be returned.
export function mapInstagramHashtagMedia(media: unknown): InstagramHashtagPost[] {
  if (!Array.isArray(media)) return [];

  const seen = new Set<string>();
  const posts: InstagramHashtagPost[] = [];
  for (const item of media) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    if (typeof record.id !== 'string' || typeof record.permalink !== 'string' || seen.has(record.id)) continue;

    let permalink: URL;
    try {
      permalink = new URL(record.permalink);
    } catch {
      continue;
    }
    if (
      permalink.protocol !== 'https:' ||
      !['instagram.com', 'www.instagram.com'].includes(permalink.hostname.toLowerCase()) ||
      !/^\/(?:p|reel|tv)\/[^/]+\/?$/i.test(permalink.pathname)
    ) continue;
    seen.add(record.id);

    const caption = typeof record.caption === 'string' ? record.caption.replace(/\s+/g, ' ').trim() : '';
    posts.push({
      id: record.id,
      permalink: permalink.toString(),
      caption: caption ? caption.slice(0, 140) : undefined,
      mediaType: typeof record.media_type === 'string' ? record.media_type : undefined,
      timestamp: typeof record.timestamp === 'string' ? record.timestamp : undefined,
    });
  }

  return posts;
}