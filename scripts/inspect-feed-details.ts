async function inspectFeedDetails() {
  const token = process.env.META_ACCESS_TOKEN;
  const pageId = process.env.META_FACEBOOK_PAGE_ID;

  // Testar chamada pública SEM token (como um visitante anônimo)
  const anonRes = await fetch(`https://graph.facebook.com/v26.0/${pageId}/posts?limit=3`);
  const anonData = await anonRes.json();
  console.log('Visualização Pública Sem Token:', anonData);

  // Consultar status do App via debug
  const debugRes = await fetch(`https://graph.facebook.com/v26.0/debug_token?input_token=${token}&access_token=${token}`);
  const debugData = await debugRes.json();
  console.log('Debug Token Profile/User:', {
    app_id: debugData.data?.app_id,
    application: debugData.data?.application,
    type: debugData.data?.type,
    user_id: debugData.data?.user_id,
    profile_id: debugData.data?.profile_id,
  });
}

inspectFeedDetails().catch(console.error);
