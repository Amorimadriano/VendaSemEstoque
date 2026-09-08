async function testShopeeDirect() {
  const appId = process.env.SHOPEE_APP_ID;
  const secret = process.env.SHOPEE_SECRET;
  console.log('AppId:', appId);

  // Test standard Shopee Open API endpoint for BR
  const endpoints = [
    'https://open-api.affiliate.shopee.com.br/graphql',
    'https://open-api.affiliate.shopee.com/graphql',
  ];

  for (const url of endpoints) {
    console.log('\nTesting endpoint:', url);
    const timestamp = Math.floor(Date.now() / 1000);
    const query = `
      query {
        productOfferV2(keyword: "fone", page: 1, limit: 3) {
          nodes {
            itemId
            productName
            price
            imageUrl
            productLink
            offerLink
          }
        }
      }
    `;
    const payload = JSON.stringify({ query });
    const factor = `${appId}${timestamp}${payload}${secret}`;
    const msgBuffer = new TextEncoder().encode(factor);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const signature = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        body: payload,
      });

      console.log('Status:', res.status);
      const text = await res.text();
      console.log('Body preview:', text.slice(0, 300));
    } catch (e: any) {
      console.log('Error:', e.message);
    }
  }
}

testShopeeDirect();
