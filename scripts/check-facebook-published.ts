import { getSupabase } from '../lib/supabase';

async function checkStatus() {
  const supabase = getSupabase();
  const { data: contents } = await supabase
    .from('marketing_content')
    .select('id, channel, status, publication_error, product:products(name)')
    .eq('channel', 'facebook');

  const published = (contents || []).filter((c) => c.status === 'PUBLISHED');
  const approved = (contents || []).filter((c) => c.status === 'APPROVED');
  const drafts = (contents || []).filter((c) => c.status === 'DRAFT');

  console.log(`=== STATUS DE CONTEÚDOS FACEBOOK ===`);
  console.log(`- Total de conteúdos: ${contents?.length || 0}`);
  console.log(`- PUBLISHED (Postados com sucesso no Facebook): ${published.length}`);
  console.log(`- APPROVED (Prontos aguardando liberação de cota): ${approved.length}`);
  console.log(`- DRAFT: ${drafts.length}`);

  console.log(`\nÚltimos publicados:`);
  for (const c of published.slice(0, 10)) {
    console.log(`✔ [POSTADO] ${(c as any).product?.name?.slice(0, 50)}`);
  }
}

checkStatus();
