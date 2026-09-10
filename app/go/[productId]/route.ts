import { NextRequest, NextResponse } from 'next/server';
import { getAffiliateUrlForProduct, registerClickAndGetAffiliateUrl } from '@/services/trackingService';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const { searchParams } = new URL(request.url);

    const userAgent = request.headers.get('user-agent') || '';
    const isAutomatedRequest = /(bot|crawler|spider|facebookexternalhit|facebot|preview|headless|slurp)/i.test(userAgent);
    const device = /mobile/i.test(userAgent) ? 'mobile' : /tablet/i.test(userAgent) ? 'tablet' : 'desktop';
    const sessionId = request.cookies.get('affiliate_session')?.value || `sess_${crypto.randomUUID()}`;

    const affiliateUrl = isAutomatedRequest
      ? await getAffiliateUrlForProduct(productId)
      : await registerClickAndGetAffiliateUrl({
          productId,
          sessionId,
          utmSource: searchParams.get('utm_source') || undefined,
          utmMedium: searchParams.get('utm_medium') || undefined,
          utmCampaign: searchParams.get('utm_campaign') || undefined,
          device,
        });

    // Redirecionamento 302 para o link de afiliado com o tracking registrado
    const response = NextResponse.redirect(affiliateUrl, 302);
    if (!isAutomatedRequest && !request.cookies.has('affiliate_session')) {
      response.cookies.set('affiliate_session', sessionId, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
    }
    return response;
  } catch (error: any) {
    console.error('Erro no tracking de clique:', error);
    return NextResponse.redirect(new URL('/', request.url));
  }
}
