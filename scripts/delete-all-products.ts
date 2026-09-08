import { getSupabase } from '../lib/supabase';

async function main() {
  console.log('Iniciando exclusão completa de todos os produtos e registros relacionados...');
  const supabase = getSupabase();

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
        console.warn(`Aviso ao limpar ${table}:`, error.message);
      } else {
        console.log(`Tabela ${table} limpa.`);
      }
    } catch (err) {
      console.warn(`Erro ao limpar ${table}:`, err);
    }
  }

  console.log('Excluindo todos os registros da tabela products...');
  const { error: productsError } = await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (productsError) {
    console.error('Erro ao excluir produtos:', productsError.message);
    throw productsError;
  }

  const { count, error: countError } = await supabase.from('products').select('*', { count: 'exact', head: true });
  if (countError) throw countError;

  console.log(`Todos os produtos foram excluídos com sucesso. Total de produtos restantes: ${count ?? 0}`);
}

main()
  .then(() => {
    console.log('Operação de limpeza finalizada com êxito.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Falha ao limpar produtos:', err);
    process.exit(1);
  });
