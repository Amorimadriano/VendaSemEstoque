import crypto from 'crypto';

async function testShopee() {
  const appId = process.env.SHOPEE_APP_ID;
  const secret = process.env.SHOPEE_SECRET;

  console.log('=== TEST SHOPEE AFFILIATE GRAPHQL API ===');
  console.log('SHOPEE_APP_ID:', appId);
  console.log('SHOPEE_SECRET length:', secret ? secret.length : 0);

  if (!appId || !secret) {
    console.error('Missing SHOPEE credentials in env');
    return;
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const query = `
    query {
      productOfferV2(keyword: "fone bluetooth", page: 1, limit: 5) {
        nodes {
          itemId
          productName
          price
          priceMin
          priceMax
          imageUrl
          productLink
          offerLink
          commissionRate
          sales
          ratingStar
        }
        pageInfo {
          page
          limit
          hasNextPage
        }
      }
    }
  `;

  const payload = JSON.stringify({ query });
  const factor = `${appId}${timestamp}${payload}${secret}`;
  const signature = crypto.createHash('sha256').update(factor).digest('hex');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`,
  };

  console.log('Sending request to https://open-api.affiliate.shopee.com.br/graphql ...');
  try {
    const res = await fetch('https://open-api.affiliate.shopee.com.br/graphql', {
      method: 'POST',
      headers,
      body: payload,
    });

    console.log('Status HTTP:', res.status);
    const text = await res.text();
    console.log('Response body:', text.slice(0, 1000));
  } catch (err) {
    console.error('Network error requesting Shopee BR:', err);
  }
}

testShopee();
