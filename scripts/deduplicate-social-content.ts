import { getSupabase } from '../lib/supabase';

async function main() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('marketing_content')
    .select('id,product_id,channel,published_at,status')
    .eq('status', 'PUBLISHED')
    .in('channel', ['facebook', 'instagram'])
    .order('published_at', { ascending: false });
  if (error) throw error;

  const kept = new Set<string>();
  const duplicateIds: string[] = [];
  for (const item of data || []) {
    const key = `${item.product_id}|${item.channel}`;
    if (kept.has(key)) duplicateIds.push(item.id);
    else kept.add(key);
  }

  if (duplicateIds.length > 0) {
    const { error: updateError } = await supabase
      .from('marketing_content')
      .update({ status: 'CANCELLED', publication_error: 'Publicação duplicada desativada automaticamente.', updated_at: new Date().toISOString() })
      .in('id', duplicateIds);
    if (updateError) throw updateError;
  }

  console.log(`Publicados analisados: ${(data || []).length}`);
  console.log(`Duplicidades desativadas: ${duplicateIds.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
