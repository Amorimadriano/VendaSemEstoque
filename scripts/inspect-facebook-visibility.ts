async function inspectFacebook() {
  const token = process.env.META_ACCESS_TOKEN;
  const pageId = process.env.META_FACEBOOK_PAGE_ID;

  console.log(`Page ID configurado: ${pageId}`);

  // 1. Informações da Página
  const pageRes = await fetch(`https://graph.facebook.com/v26.0/${pageId}?fields=id,name,link,is_published&access_token=${token}`);
  const pageData = await pageRes.json();
  console.log('1. Info da Página:', pageData);

  // 2. Token Debug (App Mode, Permissões)
  const debugRes = await fetch(`https://graph.facebook.com/v26.0/debug_token?input_token=${token}&access_token=${token}`);
  const debugData = await debugRes.json();
  console.log('2. Debug do Token:', JSON.stringify(debugData, null, 2));

  // 3. Posts recentes publicados na página
  const postsRes = await fetch(`https://graph.facebook.com/v26.0/${pageId}/feed?fields=id,message,created_time,permalink_url,is_published,privacy&limit=5&access_token=${token}`);
  const postsData = await postsRes.json();
  console.log('3. Feed / Posts:', JSON.stringify(postsData, null, 2));

  // 4. Vídeos / Reels da página
  const videosRes = await fetch(`https://graph.facebook.com/v26.0/${pageId}/videos?fields=id,description,permalink_url,published&limit=5&access_token=${token}`);
  const videosData = await videosRes.json();
  console.log('4. Vídeos da Página:', JSON.stringify(videosData, null, 2));
}

inspectFacebook().catch(console.error);
