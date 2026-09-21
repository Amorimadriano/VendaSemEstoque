import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';
import path from 'node:path';

type ServiceAccount = {
  client_email: string;
  private_key: string;
  token_uri?: string;
};

function readServiceAccount(): ServiceAccount {
  const jsonPath = path.resolve(process.cwd(), 'venda-sem-estoque-541c1142ea9f.json');
  const raw = readFileSync(jsonPath, 'utf8');
  return JSON.parse(raw) as ServiceAccount;
}

function base64Url(value: string | Buffer): string {
  return Buffer.from(value).toString('base64url');
}

async function getAccessToken(account: ServiceAccount): Promise<string> {
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64Url(
    JSON.stringify({
      iss: account.client_email,
      scope: 'https://www.googleapis.com/auth/webmasters.readonly https://www.googleapis.com/auth/webmasters',
      aud: account.token_uri || 'https://oauth2.googleapis.com/token',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  );
  const unsignedToken = `${header}.${claims}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsignedToken);
  const assertion = `${unsignedToken}.${base64Url(signer.sign(account.private_key))}`;

  const response = await fetch(account.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!response.ok) {
    throw new Error(`Falha ao autenticar no Google (${response.status}): ${await response.text()}`);
  }

  const payload = (await response.json()) as { access_token?: string };
  if (!payload.access_token) {
    throw new Error('O Google não retornou um access_token.');
  }
  return payload.access_token;
}

async function checkIndexing() {
  const account = readServiceAccount();
  const token = await getAccessToken(account);
  const site = 'https://venda-sem-estoque.pages.dev/';

  console.log('--- 1. Search Analytics (Últimos 30 dias) ---');
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);
  
  const analyticsRes = await fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      startDate: thirtyDaysAgo.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
      dimensions: ['page', 'query'],
      rowLimit: 20
    })
  });
  
  if (analyticsRes.ok) {
    const analyticsData = await analyticsRes.json();
    console.log('Resultados de Busca:', JSON.stringify(analyticsData, null, 2));
  } else {
    console.log('Status Analytics:', analyticsRes.status, await analyticsRes.text());
  }

  const testUrls = [
    'https://venda-sem-estoque.pages.dev/',
    'https://venda-sem-estoque.pages.dev/produtos',
    'https://venda-sem-estoque.pages.dev/ofertas',
    'https://venda-sem-estoque.pages.dev/mais-vendidos',
  ];

  for (const url of testUrls) {
    console.log(`\n--- Inspecionando ${url} ---`);
    const inspectRes = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inspectionUrl: url,
        siteUrl: site
      })
    });
    if (inspectRes.ok) {
      const data = await inspectRes.json();
      console.log(`Resultado ${url}:`, {
        verdict: data.inspectionResult?.indexStatusResult?.verdict,
        coverageState: data.inspectionResult?.indexStatusResult?.coverageState,
        robotsTxtState: data.inspectionResult?.indexStatusResult?.robotsTxtState,
        indexingState: data.inspectionResult?.indexStatusResult?.indexingState,
        lastCrawlTime: data.inspectionResult?.indexStatusResult?.lastCrawlTime,
      });
    } else {
      console.log(`Erro ao inspecionar ${url}:`, inspectRes.status, await inspectRes.text());
    }
  }
}

checkIndexing().catch(console.error);
