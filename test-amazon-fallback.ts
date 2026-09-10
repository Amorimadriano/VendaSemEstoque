import { getMarketplaceIntegration } from './integrations';

async function test() {
  console.log('🔍 Testando Amazon fallback diretamente...\n');
  const amazon = getMarketplaceIntegration('amazon');
  
  try {
    const products = await amazon.getProducts('celular', undefined, 4);
    console.log(`✅ Retornou ${products.length} produtos da Amazon (fallback curado):\n`);
    
    products.forEach((p, i) => {
      console.log(`${i + 1}. ${p.name}`);
      console.log(`   Preço: R$ ${p.price}`);
      console.log(`   ASIN: ${p.externalProductId}`);
      console.log(`   Rating: ${p.rating}★ (${p.reviewCount} reviews)\n`);
    });
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

test();
