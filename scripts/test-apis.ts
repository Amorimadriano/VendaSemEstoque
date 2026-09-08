import { MercadoLivreIntegration } from '../integrations/mercadolivre/MercadoLivreIntegration';
import { AliExpressIntegration } from '../integrations/aliexpress/AliExpressIntegration';

async function testML() {
  console.log('=== TEST MERCADO LIVRE ===');
  const ml = new MercadoLivreIntegration();
  const token = await (ml as any).getAccessToken();
  console.log('ML Access token exists:', Boolean(token));

  const url = 'https://api.mercadolibre.com/sites/MLB/search?q=fone+bluetooth&limit=3';
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { headers });
  console.log('ML status:', res.status);
  const text = await res.text();
  console.log('ML response:', text.slice(0, 500));
}

async function testAli() {
  console.log('\n=== TEST ALIEXPRESS ===');
  const ali = new AliExpressIntegration();
  console.log('App Key:', process.env.ALIEXPRESS_APP_KEY);
  console.log('Tracking ID:', process.env.ALIEXPRESS_TRACKING_ID);

  const params: Record<string, string> = {
    app_key: process.env.ALIEXPRESS_APP_KEY || '',
    method: 'aliexpress.affiliate.product.query',
    sign_method: 'hmac-sha256',
    format: 'json',
    v: '2.0',
    timestamp: (ali as any).formatTimestamp(new Date()),
    keywords: 'fone bluetooth',
    page_no: '1',
    page_size: '3',
    ship_to_country: 'BR',
    sort: 'SALE_PRICE_ASC',
    target_currency: 'BRL',
    target_language: 'PT',
    tracking_id: process.env.ALIEXPRESS_TRACKING_ID || '',
  };
  params.sign = await (ali as any).sign(params);

  const queryUrl = `https://api-sg.aliexpress.com/sync?${new URLSearchParams(params)}`;
  console.log('AliExpress query url params:', new URLSearchParams(params).toString().slice(0, 200));

  const res = await fetch(queryUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    }
  });
  console.log('AliExpress status:', res.status);
  const text = await res.text();
  console.log('AliExpress response:', text.slice(0, 500));
}

async function main() {
  await testML();
  await testAli();
}

main().catch(console.error);
