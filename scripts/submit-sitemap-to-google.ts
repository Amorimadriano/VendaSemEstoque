import { createSign } from 'node:crypto';

type ServiceAccount = {
  client_email: string;
  private_key: string;
  token_uri?: string;
};

const siteUrl = (process.env.SITE_URL || 'https://venda-sem-estoque.pages.dev').replace(/\/$/, '');
const sitemapUrl = `${siteUrl}/sitemap.xml`;

function readServiceAccount(): ServiceAccount {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error('Defina GOOGLE_SERVICE_ACCOUNT_JSON com o JSON da conta de serviço do Google.');
  }

  try {
    return JSON.parse(raw) as ServiceAccount;
  } catch {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON não contém um JSON válido.');
  }
}

function base64Url(value: string | Buffer): string {
  return Buffer.from(value).toString('base64url');
}

async function getAccessToken(account: ServiceAccount): Promise<string> {
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64Url(
    JSON.stringify({
      iss: account.client_email,
      scope: 'https://www.googleapis.com/auth/webmasters',
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

async function submitSitemap(): Promise<void> {
  const account = readServiceAccount();
  const accessToken = await getAccessToken(account);
  const endpoint = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(sitemapUrl)}`;
  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Falha ao enviar o sitemap (${response.status}): ${await response.text()}`);
  }

  console.log(`Sitemap enviado ao Google: ${sitemapUrl}`);
  console.log('A descoberta e o rastreamento podem levar de algumas horas a alguns dias.');
}

submitSitemap().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});