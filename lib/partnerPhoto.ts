import { PartnerError } from './partner';

export const PARTNER_PHOTO_BUCKET = 'partner-products';
export const PARTNER_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PARTNER_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export function validatePartnerPhoto(bytes: Uint8Array, contentType: string) {
  if (!bytes.length) throw new PartnerError('Selecione uma foto para enviar.');
  if (bytes.length > PARTNER_PHOTO_MAX_BYTES) throw new PartnerError('A foto deve ter no máximo 5 MB.', 413);
  const startsWith = (signature: number[], offset = 0) => signature.every((value, index) => bytes[offset + index] === value);
  const extension = contentType === 'image/jpeg' && startsWith([0xff, 0xd8, 0xff]) ? 'jpg'
    : contentType === 'image/png' && startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) ? 'png'
    : contentType === 'image/webp' && bytes.length >= 12 && startsWith([0x52, 0x49, 0x46, 0x46])
      && startsWith([0x57, 0x45, 0x42, 0x50], 8) ? 'webp' : null;
  if (!extension) throw new PartnerError('Arquivo inválido. Envie uma foto JPEG, PNG ou WebP.', 415);
  return extension;
}
