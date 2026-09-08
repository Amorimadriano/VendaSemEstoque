async function testDirectPublish() {
  const token = process.env.META_ACCESS_TOKEN;
  const igId = process.env.META_INSTAGRAM_ACCOUNT_ID;

  console.log('Testing Instagram container creation with ID:', igId);
  const body = new URLSearchParams({
    image_url: 'https://http2.mlstatic.com/D_NQ_NP_864834-MLA54955743841_042023-O.webp',
    caption: 'Teste de publicação VendaSemEstoque',
    access_token: token || '',
  });

  const res = await fetch(`https://graph.facebook.com/v26.0/${igId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const data = await res.json();
  console.log('HTTP status:', res.status);
  console.log('Response:', JSON.stringify(data, null, 2));
}

testDirectPublish();
