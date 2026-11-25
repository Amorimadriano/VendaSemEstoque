import assert from 'node:assert/strict';
import test from 'node:test';
import { formatSyncError, getProductSyncMarketplaces, inferCategory, runProductDiscovery, upsertProduct } from '../services/productDiscovery';
import { AliExpressIntegration } from '../integrations/aliexpress/AliExpressIntegration';
import { ShopeeIntegration } from '../integrations/shopee/ShopeeIntegration';

test('formats structured Supabase errors with message, code, details, and hint', () => {
  const message = formatSyncError({
    message: 'new row violates row-level security policy',
    code: '42501',
    details: 'policy denied insert on products',
    hint: 'check the service role key',
  });

  assert.equal(
    message,
    'new row violates row-level security policy | code=42501 | details=policy denied insert on products | hint=check the service role key'
  );
});

test('formats Error instances and primitive errors without losing their message', () => {
  assert.equal(formatSyncError(new Error('network unavailable')), 'network unavailable');
  assert.equal(formatSyncError('plain failure'), 'plain failure');
});

test('excludes Amazon from legacy sync settings and rejects unknown marketplaces', async () => {
  assert.deepEqual(getProductSyncMarketplaces([' Amazon ', 'ALIEXPRESS', 'shopee', 'shopee']), ['aliexpress', 'shopee']);
  assert.throws(() => getProductSyncMarketplaces(['mock']), /não suportados/);
  await assert.rejects(runProductDiscovery(['amazon']), /Nenhum marketplace habilitado/);
});

test('classifies product types rather than search keywords, brands or incidental features', () => {
  const cases = [
    ['Smart TV LED 43" Tronos FHD Wi-Fi Bluetooth Android 12', 'tv-video'],
    ['Mini Projetor Portátil 4K Android Wi-Fi Bluetooth', 'tv-video'],
    ['Pijama Masculino de Cetim com Estampa de Folhas', 'moda-acessorios'],
    ['Conjunto Masculino de 2 Peças, Camisa e Shorts', 'moda-acessorios'],
    ['Pacote com 2 Filtros de Combustível para Motores de Popa Mercury', 'automotivo-nautica'],
    ['Anodo de zinco para motor de popa Yamaha', 'automotivo-nautica'],
    ['Fones de Ouvido Bluetooth com Câmera e Gravação de Vídeo', 'audio-som'],
    ['Capa de Celular para iPhone 18 Pro Max', 'acessorios-celular'],
    ['Carregador USB-C para Notebook e Celular Xiaomi', 'acessorios-celular'],
    ['Teclado e Mouse sem Fio para Notebook e Celular', 'informatica'],
    ['Monitor Portátil OLED Touchscreen', 'informatica'],
    ['Conjunto de 4 jogos americanos de Natal para mesa', 'casa-decoracao'],
    ['Cascata 400 LEDs para decoração de Natal', 'casa-decoracao'],
    ['Smartwatch com Chamadas Bluetooth', 'smartwatches'],
    ['Jogo Grand Theft Auto GTA VI PS5', 'gamer'],
    ['Comedouro e Bebedouro Automático para Gatos e Cães', 'pets'],
    ['Produto sem identificação', 'outros'],
  ];
  for (const [title, expected] of cases) {
    assert.equal(inferCategory(title, 'smart tv').slug, expected, title);
  }
  assert.equal(inferCategory('Modelo Ultra X', 'TV & Vídeo').slug, 'tv-video');
  assert.equal(inferCategory('Pijama Masculino de Cetim', 'Smartphones').slug, 'moda-acessorios');
  assert.equal(inferCategory('Produto sem identificação', '123456').slug, 'outros');
});

test('imports only live marketplace results, without static fallback products', async (t) => {
  const keys = ['ALIEXPRESS_APP_KEY', 'ALIEXPRESS_APP_SECRET', 'ALIEXPRESS_TRACKING_ID', 'SHOPEE_APP_ID', 'SHOPEE_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const;
  const originalEnvironment = keys.map((key) => process.env[key]);
  const originalFetch = globalThis.fetch;
  for (const key of keys) process.env[key] = 'test-credential';
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  t.after(() => {
    globalThis.fetch = originalFetch;
    keys.forEach((key, index) => {
      if (originalEnvironment[index] === undefined) delete process.env[key];
      else process.env[key] = originalEnvironment[index];
    });
  });
  const ali = new AliExpressIntegration();
  const shopee = new ShopeeIntegration();

  await t.test('rejects HTTP errors instead of returning curated products', async () => {
    globalThis.fetch = async () => new Response('unavailable', { status: 503 });
    await assert.rejects(ali.getProducts('fone'), /HTTP 503/);
    await assert.rejects(shopee.getProducts('fone'), /HTTP 503/);
  });

  await t.test('surfaces provider errors instead of reimporting old products', async () => {
    globalThis.fetch = async () => Response.json({ error_response: { msg: 'Invalid signature' } });
    await assert.rejects(ali.getProducts('fone'), /Invalid signature/);
    globalThis.fetch = async () => Response.json({ errors: [{ message: 'Access denied', extensions: { code: 10020 } }] });
    await assert.rejects(shopee.getProducts('fone'), /Access denied/);
  });

  await t.test('returns an empty result when the official APIs return no offers', async () => {
    globalThis.fetch = async () => Response.json({
      aliexpress_affiliate_product_query_response: { resp_result: { result: { products: { product: [] } } } },
    });
    assert.deepEqual(await ali.getProducts('fone'), []);
    globalThis.fetch = async () => Response.json({ data: { productOfferV2: { nodes: [] } } });
    assert.deepEqual(await shopee.getProducts('fone'), []);
  });

  await t.test('does not label AliExpress search results with the search keyword', async () => {
    const item = {
      product_id: '1005001234567890', product_title: 'Pijama Masculino de Cetim',
      product_detail_url: 'https://www.aliexpress.com/item/1005001234567890.html',
      product_main_image_url: 'https://example.com/pijama.jpg', target_sale_price: '99.90',
      promotion_link: 'https://s.click.aliexpress.com/e/test-offer',
    };
    globalThis.fetch = async () => Response.json({
      aliexpress_affiliate_product_query_response: { resp_result: { result: { products: { product: [
        { ...item, first_level_category_name: 'Moda', second_level_category_name: 'Roupas' },
        { ...item, product_id: '1005001234567891' },
      ] } } } },
    });
    const products = await ali.getProducts('smart tv');
    assert.equal(products.length, 2);
    assert.equal(products[0].categoryName, 'Roupas');
    assert.equal(products[1].categoryName, 'AliExpress');
    assert.equal(inferCategory(products[0].name, products[0].categoryName).slug, 'moda-acessorios');
  });

  await t.test('retries Shopee keyword system errors with live best-selling offers', async () => {
    const queries: string[] = [];
    globalThis.fetch = async (_input, init) => {
      queries.push(JSON.parse(String(init?.body)).query);
      if (queries.length === 1) return Response.json({ errors: [{ message: 'System Error', extensions: { code: 10000 } }] });
      return Response.json({ data: { productOfferV2: { nodes: [{
        itemId: '123456',
        productName: 'Fone atual da API',
        price: 99.9,
        imageUrl: 'https://example.com/fone.jpg',
        productLink: 'https://shopee.com.br/product/123/123456',
        offerLink: 'https://s.shopee.com.br/live-offer',
      }] } } });
    };
    const products = await shopee.getProducts('fone "bluetooth"');
    assert.equal(products.length, 1);
    assert.equal(products[0].externalProductId, '123456');
    assert.equal(products[0].price, 99.9);
    assert.equal(products[0].categoryName, 'Shopee');
    assert.equal(queries.length, 2);
    assert.match(queries[0], /keyword: "fone \\"bluetooth\\""/);
    assert.doesNotMatch(queries[1], /keyword:/);
    assert.match(queries[1], /sortType: 2/);
    await assert.rejects(upsertProduct(products[0], 'amazon'), /desativado para importação/);
  });

  await t.test('does not mask failure of the Shopee best-seller request', async () => {
    let attempts = 0;
    globalThis.fetch = async () => {
      attempts += 1;
      return Response.json({ errors: [{ message: 'System Error', extensions: { code: 10000 } }] });
    };
    await assert.rejects(shopee.getProducts('fone'), /System Error/);
    assert.equal(attempts, 2);
  });

  await t.test('preserves the official Shopee affiliate offer link when saving a product', async () => {
    let savedUrl = '';
    globalThis.fetch = async (input, init) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith('/products') && init?.method === 'POST') {
        savedUrl = JSON.parse(String(init.body)).affiliate_url;
      }
      if (url.pathname.endsWith('/products') && init?.method === 'GET') return Response.json(null);
      return Response.json({ id: 'test-id' });
    };
    await upsertProduct({
      externalProductId: '123456',
      name: 'Fone atual da Shopee',
      description: 'Produto retornado pela API oficial.',
      categoryName: 'Audio',
      price: 99.9,
      imageUrl: 'https://example.com/fone.jpg',
      images: ['https://example.com/fone.jpg'],
      commissionPercentage: 8,
      commissionValue: 7.99,
      originalUrl: 'https://shopee.com.br/product/123/123456',
      affiliateUrl: 'https://s.shopee.com.br/live-offer',
      rating: 4.8,
      reviewCount: 100,
      isAvailable: true,
    }, 'shopee');
    assert.equal(savedUrl, 'https://s.shopee.com.br/live-offer');
  });
});