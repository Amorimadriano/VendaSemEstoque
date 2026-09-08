async function testInstagram() {
  const token = process.env.META_ACCESS_TOKEN;
  const igId = process.env.META_INSTAGRAM_ACCOUNT_ID;
  const pageId = process.env.META_FACEBOOK_PAGE_ID;

  console.log('=== TEST META INSTAGRAM CONNECTION ===');
  console.log('Token exists:', Boolean(token));
  console.log('Page ID:', pageId);
  console.log('Instagram Account ID:', igId);

  if (!token || !igId) {
    console.error('Missing token or IG ID');
    return;
  }

  // 1. Consulta detalhes da conta do Instagram
  console.log('\n1. Consultando https://graph.facebook.com/v26.0/' + igId + ' ...');
  try {
    const res = await fetch(
      `https://graph.facebook.com/v26.0/${igId}?fields=id,username,name,profile_picture_url&access_token=${token}`
    );
    const data = await res.json();
    console.log('Status HTTP:', res.status);
    console.log('Dados da conta Instagram:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Erro na requisição IG:', err);
  }

  // 2. Consulta limites de publicação no Instagram
  console.log('\n2. Consultando content_publishing_limit...');
  try {
    const res = await fetch(
      `https://graph.facebook.com/v26.0/${igId}/content_publishing_limit?fields=config,quota_usage&access_token=${token}`
    );
    const data = await res.json();
    console.log('Status HTTP:', res.status);
    console.log('Publishing Limit:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Erro ao consultar limit:', err);
  }
}

testInstagram();
