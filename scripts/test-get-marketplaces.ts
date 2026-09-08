import { getMarketplaces } from '../services/productService';

async function main() {
  const mkts = await getMarketplaces();
  console.log('getMarketplaces() result:');
  console.log(JSON.stringify(mkts, null, 2));
}

main().catch(console.error);
