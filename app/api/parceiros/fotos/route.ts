import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { PartnerError } from '@/lib/partner';
import { assertPartnerOrigin, limitPartnerRequests, partnerApiError, readPartnerBytes, requirePartner } from '@/lib/partnerAuth';
import { PARTNER_PHOTO_BUCKET, PARTNER_PHOTO_MAX_BYTES, PARTNER_PHOTO_TYPES, validatePartnerPhoto } from '@/lib/partnerPhoto';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    assertPartnerOrigin(request);
    const partner = await requirePartner(request);
    if (partner.status === 'SUSPENDED') throw new PartnerError('Conta suspensa para envio de novas fotos.', 403);
    await limitPartnerRequests(request, 'partner-photo', 10, partner.id);
    const contentType = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() || '';
    if (!PARTNER_PHOTO_TYPES.some((type) => type === contentType)) {
      throw new PartnerError('Envie uma foto JPEG, PNG ou WebP de até 5 MB.', 415);
    }
    const bytes = await readPartnerBytes(request, PARTNER_PHOTO_MAX_BYTES);
    const extension = validatePartnerPhoto(bytes, contentType);
    const path = `${partner.id}/${crypto.randomUUID()}.${extension}`;
    const bucket = getSupabase().storage.from(PARTNER_PHOTO_BUCKET);
    const { error } = await bucket.upload(path, bytes, { contentType, cacheControl: '31536000', upsert: false });
    if (error) throw error;
    const { data } = bucket.getPublicUrl(path);
    return NextResponse.json({ image_url: data.publicUrl }, { status: 201, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return partnerApiError(error); }
}
