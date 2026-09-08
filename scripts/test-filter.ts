import { getProducts } from '../services/productService';

async function main() {
  console.log('Testing getProducts for AliExpress...');
  const aliProducts = await getProducts({ marketplaceSlug: 'aliexpress' });
  console.log(`Total AliExpress products: ${aliProducts.total}`);
  for (const p of aliProducts.products) {
    console.log(`- [${p.externalProductId}] ${p.name.slice(0, 45)}... | Preço: R$ ${p.price} | Categoria: ${p.category?.name}`);
  }

  console.log('\nTesting getProducts for Mercado Livre...');
  const mlProducts = await getProducts({ marketplaceSlug: 'mercadolivre' });
  console.log(`Total Mercado Livre products: ${mlProducts.total}`);
  for (const p of mlProducts.products) {
    console.log(`- [${p.externalProductId}] ${p.name.slice(0, 45)}... | Preço: R$ ${p.price} | Categoria: ${p.category?.name}`);
  }
}

main().catch(console.error);
