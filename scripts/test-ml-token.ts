import { MercadoLivreIntegration } from '../integrations/mercadolivre/MercadoLivreIntegration';

async function testML() {
  const ml = new MercadoLivreIntegration();
  console.log('Testing ML token refresh...');
  const refreshed = await (ml as any).refreshAccessToken();
  console.log('Refreshed token:', refreshed ? 'YES (length ' + refreshed.length + ')' : 'NO');
}

testML();
