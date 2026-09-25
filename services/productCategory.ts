function toSlug(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

export function inferCategory(title: string, rawCategory?: string): { name: string; slug: string } {
  const text = `${title} ${rawCategory || ''}`.toLowerCase();

  if (/\b(smartwatch|smart watch|relogio inteligente|redmi watch|galaxy watch|apple watch|band 8|band 9|mi band)\b/.test(text)) {
    return { name: 'Smartwatches', slug: 'smartwatches' };
  }
  if (/\b(iphone|smartphone|celular|galaxy s|galaxy a|redmi note|xiaomi|motorola|poco)\b/.test(text)) {
    return { name: 'Smartphones', slug: 'smartphones' };
  }
  if (/\b(fone|headset|earphone|earbuds|caixa de som|soundbar|jbl|bluetooth|tws|airpods|headphone|som)\b/.test(text)) {
    return { name: 'Áudio & Som', slug: 'audio-som' };
  }
  if (/\b(notebook|laptop|computador|teclado|mouse|hub usb|usb-c|ssd|memoria ram|placa de video|monitor|roteador|informática|informatica)\b/.test(text)) {
    return { name: 'Informática', slug: 'informatica' };
  }
  if (/\b(carregador|cabo usb|cabo tipo c|power bank|suporte celular|pelicula|capinha|adaptador|gan)\b/.test(text)) {
    return { name: 'Acessórios Celular', slug: 'acessorios-celular' };
  }
  if (/\b(alexa|echo dot|lampada|fita led|led|tomada inteligente|sensor|tuya|sonoff|smart home|camera)\b/.test(text)) {
    return { name: 'Casa Inteligente', slug: 'casa-inteligente' };
  }
  if (/\b(air fryer|fritadeira|cafeteira|aspirador|liquidificador|batedeira|micro-ondas|eletrodomestico|eletrodoméstico)\b/.test(text)) {
    return { name: 'Eletrodomésticos', slug: 'eletrodomesticos' };
  }
  if (/\b(smart tv|televisao|televisor|tv 4k|tv 50|tv 55|tv 65|fire tv|chromecast|roku|video|vídeo)\b/.test(text)) {
    return { name: 'TV & Vídeo', slug: 'tv-video' };
  }
  if (/\b(gamer|gamepad|controle ps5|controle xbox|nintendo|switch|jogos)\b/.test(text)) {
    return { name: 'Gamer', slug: 'gamer' };
  }

  const baseName = rawCategory && !['Amazon', 'AliExpress', 'Shopee'].includes(rawCategory) ? rawCategory : 'Eletrônicos';
  return { name: baseName, slug: toSlug(baseName) };
}