import { MercadoLivreIntegration } from '../integrations/mercadolivre/MercadoLivreIntegration';
import { AliExpressIntegration } from '../integrations/aliexpress/AliExpressIntegration';

async function diagnose() {
  console.log('--- TEST MERCADO LIVRE ---');
  const ml = new MercadoLivreIntegration();
  const mlProducts = await ml.getProducts('fone bluetooth', undefined, 5);
  console.log(`ML Products returned: ${mlProducts.length}`);
  if (mlProducts.length > 0) {
    console.log('Sample ML Product:', mlProducts[0]);
  }

  console.log('\n--- TEST ALIEXPRESS ---');
  const ali = new AliExpressIntegration();
  try {
    const aliProducts = await ali.getProducts('fone bluetooth', undefined, 5);
    console.log(`AliExpress Products returned: ${aliProducts.length}`);
    if (aliProducts.length > 0) {
      console.log('Sample AliExpress Product:', aliProducts[0]);
    }
  } catch (e: any) {
    console.log('AliExpress error:', e.message);
  }
}

diagnose();
