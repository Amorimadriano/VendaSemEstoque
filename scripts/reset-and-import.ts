import { getSupabase } from '../lib/supabase';
import { runProductDiscovery } from '../services/productDiscovery';

async function main() {
  console.log('Iniciando limpeza de produtos existentes na base de dados...');
  const supabase = getSupabase();

  // 1. Limpeza de tabelas dependentes
  const dependentTables = [
    'marketing_videos',
    'marketing_campaigns',
    'marketing_content',
    'marketing_ab_tests',
    'conversions',
    'clicks',
    'affiliate_links',
    'favorites',
    'product_metrics',
    'price_history',
  ];

  for (const table of dependentTables) {
    try {
      const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) {
        console.warn(`Aviso ao limpar tabela ${table}:`, error.message);
      } else {
        console.log(`Tabela ${table} limpa.`);
      }
    } catch (err) {
      console.warn(`Erro ao limpar ${table}:`, err);
    }
  }

  // 2. Exclusão de todos os produtos
  console.log('Excluindo produtos da tabela products...');
  const { error: productsError } = await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (productsError) {
    console.error('Erro ao excluir produtos:', productsError.message);
    throw productsError;
  }
  console.log('Todos os produtos foram excluídos com sucesso.');

  // 3. Execução da descoberta e reimportação dos novos produtos
  console.log('Iniciando reimportação de produtos via Mercado Livre e AliExpress...');
  const result = await runProductDiscovery();
  console.log('Resultado da reimportação:', JSON.stringify(result, null, 2));
}

main()
  .then(() => {
    console.log('Processo de exclusão e reimportação concluído com sucesso!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Falha no processo:', err);
    process.exit(1);
  });
