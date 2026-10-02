export const INSTAGRAM_PROFILE_STATUSES = [
  'PENDING_REVIEW',
  'FOLLOWED_MANUALLY',
  'SKIPPED',
] as const;

export type InstagramProfileStatus = (typeof INSTAGRAM_PROFILE_STATUSES)[number];

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