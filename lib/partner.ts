import { z } from 'zod';

export const PARTNER_TERMS_VERSION = '2026-11-24';
export const PARTNER_PRODUCT_MAX_PHOTOS = 10;
const partnerImageUrl = z.string().url().max(2000).refine((value) => new URL(value).protocol === 'https:', 'Use imagem HTTPS');
export const partnerProductSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(5).max(120),
  description: z.string().trim().min(40).max(5000),
  image_url: partnerImageUrl,
  image_urls: z.array(partnerImageUrl).min(1).max(PARTNER_PRODUCT_MAX_PHOTOS)
    .refine((images) => new Set(images).size === images.length, 'Não repita fotos na galeria').optional(),
  price_cents: z.number().int().min(100).max(10000000),
  stock: z.number().int().min(0).max(100000),
  delivery_days: z.number().int().min(1).max(60),
  return_policy: z.string().trim().min(30).max(2000),
});

export const buyerSchema = z.object({
  name: z.string().trim().min(3).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().regex(/^[+\d ()-]{10,25}$/),
  postal_code: z.string().regex(/^\d{8}$/),
  address: z.string().trim().min(10).max(300),
  city: z.string().trim().min(2).max(100),
  state: z.string().regex(/^[A-Z]{2}$/),
});

export type Partner = {
  id: string; email: string; store_name: string; legal_name: string; document: string; phone: string;
  business_address: string; status: 'PENDING' | 'ACTIVE' | 'SUSPENDED'; review_note: string | null;
  accepted_commission_bps: number | null; terms_version: string;
};
export type PartnerProduct = z.infer<typeof partnerProductSchema> & {
  id: string; partner_id: string; status: 'PENDING_REVIEW' | 'ACTIVE' | 'REJECTED' | 'INACTIVE';
  review_note: string | null; created_at: string; updated_at: string;
};
export function partnerProductImages(product: Pick<PartnerProduct, 'image_url' | 'image_urls'>) {
  return [...new Set([product.image_url, ...(product.image_urls || [])])];
}
export const partnerOrderSchema = z.object({
  id: z.string().uuid(), product_id: z.string().uuid(), partner_id: z.string().uuid(), product_name: z.string(),
  total_cents: z.number().int().positive(), commission_bps: z.number().int(), commission_cents: z.number().int().positive(),
  buyer: buyerSchema, status: z.enum(['PENDING','PAID','PARTIALLY_REFUNDED','REFUNDED','DISPUTED','REVIEW','EXPIRED']),
  fulfillment_status: z.enum(['UNFULFILLED','SHIPPED','DELIVERED']),
  tracking_code: z.string().nullable(), preference_id: z.string().nullable(), checkout_url: z.string().nullable(),
  paid_cents: z.number().int(), refunded_cents: z.number().int(), earned_commission_cents: z.number().int(),
  receipt_token: z.string().uuid(), expires_at: z.string(), created_at: z.string(),
});
export type PartnerOrder = z.infer<typeof partnerOrderSchema>;
export const partnerOrderLabels: Record<PartnerOrder['status'], string> = {
  PENDING: 'Aguardando confirmação', PAID: 'Pagamento confirmado', PARTIALLY_REFUNDED: 'Parcialmente reembolsado',
  REFUNDED: 'Reembolsado', DISPUTED: 'Em disputa', REVIEW: 'Em revisão administrativa', EXPIRED: 'Pedido expirado',
};
export const partnerDeliveryLabels: Record<PartnerOrder['fulfillment_status'], string> = {
  UNFULFILLED: 'Aguardando envio', SHIPPED: 'Enviado', DELIVERED: 'Entregue',
};

export class PartnerError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function commissionBps(): number | null {
  const raw = process.env.PARTNER_COMMISSION_BPS;
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 9999) throw new PartnerError('PARTNER_COMMISSION_BPS deve estar entre 1 e 9999.', 503);
  return value;
}

export function commissionCents(total: number, bps: number) {
  if (!Number.isSafeInteger(total) || total < 1 || !Number.isInteger(bps) || bps < 1 || bps > 9999) throw new PartnerError('Valores de comissão inválidos.');
  return Math.round(total * bps / 10000);
}

export function moneyToCents(value: string | number) {
  const text = String(value);
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new PartnerError('Valor monetário inválido.');
  const [whole, fraction = ''] = text.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents)) throw new PartnerError('Valor monetário fora do limite.');
  return cents;
}

export function formatBRL(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

export function partnerPaymentConfig() {
  const enabled = process.env.PARTNER_PAYMENTS_ENABLED === 'true';
  const configured = Boolean(process.env.MERCADOPAGO_CLIENT_ID && process.env.MERCADOPAGO_CLIENT_SECRET &&
    process.env.MERCADOPAGO_WEBHOOK_SECRET && process.env.PARTNER_TOKEN_ENCRYPTION_KEY && commissionBps());
  return { enabled, configured, commissionBps: commissionBps(), mode: process.env.MERCADOPAGO_MODE === 'production' ? 'production' : 'sandbox' };
}

export function requirePartnerPayments() {
  const config = requirePartnerPaymentConfig();
  if (!config.enabled) throw new PartnerError('Pagamentos de parceiros ainda não estão habilitados. Nenhuma cobrança foi realizada.', 503);
  return config;
}

export function requirePartnerPaymentConfig() {
  const config = partnerPaymentConfig();
  if (!config.configured) throw new PartnerError('Integração de pagamentos não configurada.', 503);
  return config;
}

export function publicSiteUrl() {
  const raw = process.env.SITE_URL || 'https://venda-sem-estoque.pages.dev';
  const url = new URL(raw);
  if (url.protocol !== 'https:' && url.hostname !== 'localhost') throw new PartnerError('SITE_URL deve usar HTTPS.', 503);
  return url.origin;
}
