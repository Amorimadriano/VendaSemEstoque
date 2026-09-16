import { getSupabase } from '@/lib/supabase';

export type CommentPlatform = 'facebook' | 'instagram';

export interface IncomingComment {
  platform: CommentPlatform;
  commentId: string;
  postId?: string;
  fromId?: string;
  text: string;
}

const BLOCKED_KEYWORDS = ['golpe', 'scam', 'idiota', 'burro', 'lixo', 'fraude'];

const RULES: Array<{ pattern: RegExp; reply: string }> = [
  {
    pattern: /pre[çc]o|valor|quanto custa/i,
    reply: 'Olá! Você confere o preço e a disponibilidade atualizados diretamente no link da loja parceira que está na descrição. 🙂',
  },
  {
    pattern: /entrega|frete|prazo/i,
    reply: 'O prazo e o valor de entrega são calculados pela loja parceira no momento da compra, com base no seu CEP.',
  },
  {
    pattern: /dispon[íi]vel|estoque|ainda tem/i,
    reply: 'A disponibilidade é confirmada em tempo real na página da loja parceira. Recomendamos conferir por lá!',
  },
  {
    pattern: /obrigad|amei|ador|show|top demais/i,
    reply: 'Que bom que gostou! Obrigado pelo carinho. 😊',
  },
];

function isAbusiveOrSpam(text: string): boolean {
  const normalized = text.toLowerCase();
  return BLOCKED_KEYWORDS.some((word) => normalized.includes(word));
}

export function generateAutoReply(commentText: string): string | null {
  const text = (commentText || '').trim();
  if (!text || isAbusiveOrSpam(text)) return null;

  const matchedRule = RULES.find((rule) => rule.pattern.test(text));
  return matchedRule?.reply || null;
}

async function alreadyReplied(platform: CommentPlatform, commentId: string): Promise<boolean> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('comment_replies')
    .select('id')
    .eq('platform', platform)
    .eq('comment_id', commentId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

async function postFacebookReply(commentId: string, message: string): Promise<string> {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) throw new Error('META_ACCESS_TOKEN não configurado.');

  const response = await fetch(`https://graph.facebook.com/v26.0/${commentId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ message, access_token: token }),
  });
  const result = await response.json() as { id?: string; error?: { message?: string } };
  if (!response.ok || !result.id) throw new Error(result.error?.message || `Meta API retornou ${response.status} ao responder o comentário.`);
  return result.id;
}

async function postInstagramReply(commentId: string, message: string): Promise<string> {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) throw new Error('META_ACCESS_TOKEN não configurado.');

  const response = await fetch(`https://graph.facebook.com/v26.0/${commentId}/replies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ message, access_token: token }),
  });
  const result = await response.json() as { id?: string; error?: { message?: string } };
  if (!response.ok || !result.id) throw new Error(result.error?.message || `Meta API retornou ${response.status} ao responder o comentário.`);
  return result.id;
}

export async function handleIncomingComment(comment: IncomingComment): Promise<{ replied: boolean; replyId?: string; reason?: string }> {
  const pageOrAccountId = comment.platform === 'facebook' ? process.env.META_FACEBOOK_PAGE_ID : process.env.META_INSTAGRAM_ACCOUNT_ID;
  if (comment.fromId && pageOrAccountId && comment.fromId === pageOrAccountId) {
    return { replied: false, reason: 'Comentário feito pela própria página, ignorado para evitar loop.' };
  }

  if (await alreadyReplied(comment.platform, comment.commentId)) {
    return { replied: false, reason: 'Comentário já respondido anteriormente.' };
  }

  const reply = generateAutoReply(comment.text);
  if (!reply) {
    return { replied: false, reason: 'Nenhuma regra correspondeu ao comentário; resposta automática não é segura para este caso.' };
  }

  const replyId = comment.platform === 'facebook'
    ? await postFacebookReply(comment.commentId, reply)
    : await postInstagramReply(comment.commentId, reply);

  const supabase = getSupabase();
  const { error } = await supabase.from('comment_replies').insert({
    platform: comment.platform,
    comment_id: comment.commentId,
    post_id: comment.postId || null,
    from_id: comment.fromId || null,
    comment_text: comment.text,
    reply_text: reply,
    reply_id: replyId,
  });
  if (error) throw error;

  return { replied: true, replyId };
}
