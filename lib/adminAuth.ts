const COOKIE_NAME = 'admin_session';
const SESSION_TTL_SECONDS = 60 * 60 * 8;

function toBase64Url(value: string) {
  return btoa(value).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function fromBase64Url(value: string) {
  return atob(value.replace(/-/g, '+').replace(/_/g, '/'));
}

async function sign(value: string) {
  const secret = process.env.NEXTAUTH_SECRET || 'change-this-secret';
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return toBase64Url(String.fromCharCode(...new Uint8Array(signature)));
}

export async function createAdminSession(admin: { id: string; email: string; role: string }) {
  const payload = toBase64Url(JSON.stringify({ ...admin, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS }));
  return `${payload}.${await sign(payload)}`;
}

export async function verifyAdminSession(token?: string | null) {
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature || signature !== await sign(payload)) return null;
  try {
    const session = JSON.parse(fromBase64Url(payload)) as { id: string; email: string; role: string; exp: number };
    if (session.exp < Math.floor(Date.now() / 1000) || !['ADMIN', 'SUPERADMIN'].includes(session.role)) return null;
    return session;
  } catch {
    return null;
  }
}

export { COOKIE_NAME, SESSION_TTL_SECONDS };
