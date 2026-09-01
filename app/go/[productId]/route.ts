import { NextRequest, NextResponse } from 'next/server';
import { registerClickAndGetAffiliateUrl } from '@/services/trackingService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const { searchParams } = new URL(request.url);

    const userAgent = request.headers.get('user-agent') || '';
    const device = /mobile/i.test(userAgent) ? 'mobile' : /tablet/i.test(userAgent) ? 'tablet' : 'desktop';

    const affiliateUrl = await registerClickAndGetAffiliateUrl({
      productId,
      utmSource: searchParams.get('utm_source') || undefined,
      utmMedium: searchParams.get('utm_medium') || undefined,
      utmCampaign: searchParams.get('utm_campaign') || undefined,
      device,
    });

    // Redirecionamento 302 para o link de afiliado com o tracking registrado
    return NextResponse.redirect(affiliateUrl, 302);
  } catch (error: any) {
    console.error('Erro no tracking de clique:', error);
    return NextResponse.redirect(new URL('/', request.url));
  }
}
