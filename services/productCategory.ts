function toSlug(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

const rules: { name: string; pattern: RegExp }[] = [
  { name: 'Smartwatches', pattern: /\b(smart\s?watch|relogio inteligente|redmi watch|galaxy watch|apple watch|mi band|band [89])\b/ },
  { name: 'Acessórios Celular', pattern: /\b(carregador(?:es)?|power\s?bank|cabo (?:usb|tipo c)|air\s?tag|rastreador)\b|\b(capas?|capinhas?|peliculas?|suportes?|lentes?)\b.*\b(celular|telefone|smartphone|iphone|samsung|tablet)\b/ },
  { name: 'Áudio & Som', pattern: /\b(fones?|headsets?|earphones?|earbuds|headphones?|airpods|tws|caixa de som|soundbar|microfones?|coluna bluetooth)\b/ },
  { name: 'Beleza & Saúde', pattern: /\b(serum|peptideo|hidratante|perfume|fragrancia|body splash|hair mask|mascara capilar|mesoterapia|massageador|medicamentos?|primeiros socorros|pressao arterial|creatina)\b/ },
  { name: 'Música & Instrumentos', pattern: /\b(cassetes?|fita cassete|cd de musica|album de (?:musica|estudio)|radiohead|piano eletronico|teclado midi|orgao eletronico|sintetizador)\b/ },
  { name: 'Automotivo & Náutica', pattern: /\b(motor(?:es)? de popa|motor do barco|motor diesel|mercruiser|mercury|mercurio|yanmar|volvo penta|helice|maritima|maritimo|freio|ignicao|cambio|tubo de combustivel|coletor de escape|vedacao de oleo|ar condicionado automotivo|veiculos eletricos|sterndrive|driveshaft|transom)\b/ },
  { name: 'Moda & Acessórios', pattern: /\b(pijamas?|camisas?|camisetas?|camisolas?|calcas?|moletons?|moletom|roupas?|vestidos?|cardiga|meias|body com renda|macaquinho|tenis|shorts|clothing|shirt|drawstring|conjunto (?:masculino|feminino|de duas pecas|de 2 pecas))\b/ },
  { name: 'Pets', pattern: /\b(comedouro|bebedouro|caminha pet|caminha.*(?:gato|cachorro))\b/ },
  { name: 'Esportes & Lazer', pattern: /\b(halteres?|pesos para academia|snowboard|esqui|bicicleta|camping|apito)\b/ },
  { name: 'Casa & Decoração', pattern: /\b(natal|decoracao|decorativ[oa]s?|presepio|casticais|castical|porta-velas|escultura|arte de parede|estatua mural|menorah|crucifixo|lanterna|luminaria|luminarias|cascata|cortina|luz solar|cordao de luz|mesa|cadeira|estante|armario|armazenamento|organizador|organizacao|potes|copo|copos|caneca|xicara|tacas|kit cama|lencol|churrasco|sabao|lavagem de maos|aromatizador de ambiente)\b/ },
  { name: 'Brinquedos', pattern: /\b(brinquedos?|robo|robos|boneca|bonecas|pelucia|figura de acao)\b/ },
  { name: 'Papelaria & Artesanato', pattern: /\b(artesanato|bordado|costura|cadernos?|blocos de notas|papel sulfite|fotos.*reveladas|adesivos|bolsa.*colorir)\b/ },
  { name: 'Ferramentas & Construção', pattern: /\b(alicates?|paquimetro|desmagnetizador|dessecantes|silica gel|cola|adesivo cianoacrilato|conector de cotovelo|placa de led|placa smd|regulador eletronico|interruptor(?:es)?|membrana.*eptfe|equipamentos mecanicos|ferramentas?|tapetes.*antiestaticos|extensao eletrica)\b/ },
  { name: 'Gamer', pattern: /\b(gamepad|playstation|ps[345]|xbox|nintendo|steam deck|console|jogo.*grand theft auto)\b/ },
  { name: 'Informática', pattern: /\b(notebooks?|laptops?|computador(?:es)?|teclados?|mouses?|hub usb|ssd|memoria ram|cartao.*memoria|micro sd|placa de video|monitor(?:es)?|roteador(?:es)?|informatica)\b/ },
  { name: 'TV & Vídeo', pattern: /\b(tv|smarttv|televisao|televisor(?:es)?|projetor|chromecast|roku|home theater)\b/ },
  { name: 'Eletrodomésticos', pattern: /\b(air\s?fryer|fritadeira|cafeteira|aspirador|liquidificador|batedeira|micro-ondas|omeleteira|ventilador|processador.*alimentos|purificador|chuveiro|eletrodomesticos?|maquina de limpeza)\b/ },
  { name: 'Casa Inteligente', pattern: /\b(alexa|echo dot|tomada inteligente|lampada inteligente|fita led inteligente|tuya|sonoff|smart home|cameras?|baba eletronica|termometro|higrometro)\b/ },
  { name: 'Smartphones', pattern: /\b(iphone|smartphones?|celular|galaxy [as]\d*|redmi note|motorola|poco)\b/ },
  { name: 'Eletrônicos', pattern: /\b(oculos inteligentes|gerador|repelente.*eletronico|eletronicos)\b/ },
];

export function inferCategory(title: string, rawCategory?: string): { name: string; slug: string } {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const text = normalize(title);
  const match = rules.find((rule) => rule.pattern.test(text));
  // Only actual category names may be fallbacks; search queries are not categories.
  const fallback = rules.find((rule) => normalize(rule.name) === normalize(rawCategory?.trim() || ''));
  const name = match?.name || fallback?.name || 'Outros';
  return { name, slug: toSlug(name) };
}