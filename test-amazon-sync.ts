import { runProductDiscovery } from './services/productDiscovery';

async function test() {
  console.log('🔍 Iniciando teste de sincronização de marketplaces...\n');
  try {
    const result = await runProductDiscovery();
    console.log('📊 Resultado da sincronização:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Erro ao sincronizar:', error);
  }
}

test();
