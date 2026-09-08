import { runProductDiscovery } from '../services/productDiscovery';

async function main() {
  console.log('Testing runProductDiscovery()...');
  try {
    const result = await runProductDiscovery();
    console.log('Success:', JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error('Error in runProductDiscovery:', err);
  }
}

main();
