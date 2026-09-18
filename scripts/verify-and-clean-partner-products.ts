import { runProductPartnerVerifierAgent } from '../services/productPartnerVerifierAgent';

async function main() {
  console.log('🤖 =========================================================');
  console.log('🤖 AGENTE DE VERIFICAÇÃO E LIMPEZA DE PRODUTOS PARCEIROS');
  console.log('🤖 =========================================================\n');

  const result = await runProductPartnerVerifierAgent({ batchSize: 200 });

  console.log('\n📊 === RELATÓRIO DE EXECUÇÃO ===');
  console.log(`- Total de produtos verificados: ${result.totalChecked}`);
  console.log(`- Produtos válidos e ativos: ${result.healthyCount}`);
  console.log(`- Produtos excluídos (inexistentes/inválidos): ${result.deletedCount}`);

  if (result.deletedProducts.length > 0) {
    console.log('\n🗑️ PRODUTOS REMOVIDOS DO BANCO:');
    result.deletedProducts.forEach((p, idx) => {
      console.log(`  ${idx + 1}. [${p.marketplaceSlug.toUpperCase()}] ${p.name}`);
      console.log(`     ID Externo: ${p.externalProductId} | Motivo: ${p.reason}`);
    });
  }

  if (result.errors.length > 0) {
    console.log('\n⚠️ AVISOS/ERROS ENCONTRADOS:');
    result.errors.forEach((err) => console.log(`  - ${err}`));
  }

  console.log('\n✅ Processamento do Agente concluído!');
}

main().catch((err) => {
  console.error('Erro fatal no agente:', err);
  process.exit(1);
});
