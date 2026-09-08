import { getSupabase } from '../lib/supabase';

async function main() {
  const supabase = getSupabase();
  // Busca categorias e contagem de produtos
  const { data: categories, error } = await supabase.from('categories').select('id, name, slug, products(count)');
  if (error) throw error;

  console.log('Categorias encontradas:');
  for (const cat of categories || []) {
    const count = cat.products?.[0]?.count ?? 0;
    console.log(`- ${cat.name} (${cat.slug}): ${count} produtos`);
    if (count === 0) {
      console.log(`  -> Removendo categoria vazia: ${cat.name}`);
      await supabase.from('categories').delete().eq('id', cat.id);
    }
  }

  console.log('Limpeza de categorias vazias concluída.');
}

main().catch(console.error);
