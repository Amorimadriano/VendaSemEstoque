import { NextRequest, NextResponse } from 'next/server';
import { handleIncomingComment, type CommentPlatform } from '@/services/commentAutoReply';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
  const mode = request.nextUrl.searchParams.get('hub.mode');
  const token = request.nextUrl.searchParams.get('hub.verify_token');
  const challenge = request.nextUrl.searchParams.get('hub.challenge');

  if (!verifyToken) {
    return NextResponse.json({ error: 'Webhook não configurado.', reason: 'META_WEBHOOK_VERIFY_TOKEN ausente.' }, { status: 503 });
  }
  if (mode === 'subscribe' && token === verifyToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: 'Verificação de webhook inválida.' }, { status: 403 });
}

async function verifySignature(rawBody: string, signatureHeader: string | null): Promise<boolean> {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret || !signatureHeader) return false;

  const expectedPrefix = 'sha256=';
  if (!signatureHeader.startsWith(expectedPrefix)) return false;

  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(appSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const computedSignature = Array.from(new Uint8Array(signatureBuffer)).map((byte) => byte.toString(16).padStart(2, '0')).join('');

  return computedSignature === signatureHeader.slice(expectedPrefix.length);
}

type MetaChangeValue = {
  item?: string;
  verb?: string;
  comment_id?: string;
  post_id?: string;
  from?: { id?: string };
  message?: string;
  id?: string;
  text?: string;
};

type MetaEntry = {
  id?: string;
  changes?: Array<{ field?: string; value?: MetaChangeValue }>;
};

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signatureHeader = request.headers.get('x-hub-signature-256');

  if (!(await verifySignature(rawBody, signatureHeader))) {
    return NextResponse.json({ error: 'Assinatura do webhook inválida.' }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as { object?: string; entry?: MetaEntry[] };
  const platform: CommentPlatform | null = payload.object === 'page' ? 'facebook' : payload.object === 'instagram' ? 'instagram' : null;
  if (!platform) {
    return NextResponse.json({ ignored: true, reason: 'Objeto de webhook não suportado.' });
  }

  const results: Array<{ commentId: string; replied: boolean; reason?: string; error?: string }> = [];

  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      const isFacebookComment = platform === 'facebook' && change.field === 'feed' && value.item === 'comment' && value.verb === 'add';
      const isInstagramComment = platform === 'instagram' && change.field === 'comments';
      if (!isFacebookComment && !isInstagramComment) continue;

      const commentId = value.comment_id || value.id;
      const text = value.message || value.text || '';
      if (!commentId) continue;

      try {
        const result = await handleIncomingComment({
          platform,
          commentId,
          postId: value.post_id,
          fromId: value.from?.id,
          text,
        });
        results.push({ commentId, replied: result.replied, reason: result.reason });
      } catch (error) {
        results.push({ commentId, replied: false, error: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
