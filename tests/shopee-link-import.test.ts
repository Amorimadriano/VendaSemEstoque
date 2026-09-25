import test from 'node:test';
import assert from 'node:assert/strict';
import { parseShopeeProductPage } from '../services/shopeeLinkImport';

test('extracts product details from Shopee Open Graph metadata', async () => {
  const html = '<html><head><meta content="Produto de teste | Shopee Brasil" property="og:title"><meta property="og:image" content="https://down-br.img.susercontent.com/image.png"><meta property="product:price:amount" content="1.234,56"></head></html>';
  const product = await parseShopeeProductPage(html, 'https://shopee.com.br/product/123/456', 'https://s.shopee.com.br/example');

  assert.equal(product.name, 'Produto de teste');
  assert.equal(product.price, 1234.56);
  assert.equal(product.externalProductId, '456');
  assert.equal(product.affiliateUrl, 'https://s.shopee.com.br/example');
});

test('extracts product price from JSON-LD when Open Graph has no price', async () => {
  const html = '<script type="application/ld+json">{"@type":"Product","name":"Fone Bluetooth","image":"https://down-br.img.susercontent.com/fone.png","offers":{"price":"49.90"}}</script>';
  const product = await parseShopeeProductPage(html, 'https://shopee.com.br/product/123/789', 'https://s.shopee.com.br/example');

  assert.equal(product.name, 'Fone Bluetooth');
  assert.equal(product.price, 49.9);
  assert.equal(product.externalProductId, '789');
});

test('rejects pages without verifiable title, image, and price', async () => {
  await assert.rejects(
    parseShopeeProductPage('<html><head><meta property="og:title" content="Sem dados"></head></html>', 'https://shopee.com.br/product/123/456', 'https://s.shopee.com.br/example'),
    /não forneceu nome, imagem HTTPS e preço verificáveis/,
  );
});