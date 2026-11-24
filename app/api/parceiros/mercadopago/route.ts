import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { partnerApiError, requirePartner } from '@/lib/partnerAuth';
import { publicSiteUrl } from '@/lib/partner';
import { createPartnerOAuth, finishPartnerOAuth } from '@/services/partnerPayments';

export const runtime = 'edge';
export async function GET(request: NextRequest) {
  try {
    const partner = await requirePartner(request);
    const params = request.nextUrl.searchParams;
    if (params.has('error')) return NextResponse.redirect(`${publicSiteUrl()}/parceiros/painel?pagamento=cancelado`);
    if (params.has('code')) {
      const input = z.object({ code: z.string().min(1).max(2000), state: z.string().regex(/^[\w-]{43}$/) })
        .parse({ code: params.get('code'), state: params.get('state') });
      await finishPartnerOAuth(partner.id, input.state, input.code);
      return NextResponse.redirect(`${publicSiteUrl()}/parceiros/painel?pagamento=conectado`);
    }
    return NextResponse.redirect(await createPartnerOAuth(partner.id));
  } catch (error) { return partnerApiError(error); }
}
