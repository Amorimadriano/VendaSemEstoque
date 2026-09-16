import { getSupabase } from '@/lib/supabase';
import { getProducts } from '@/services/productService';
import Link from 'next/link';
import { Flame, Trophy, Percent, ExternalLink, Search, ShoppingBag, MessageCircle, Sparkles, Instagram, Facebook } from 'lucide-react';
import BioClientList from './BioClientList';

export const runtime = 'edge';
export const revalidate = 60; // 1 min ISR

export const metadata = {
  title: 'Links e Ofertas em Destaque | VendaSemEstoque',
  description: 'Acesse os links dos produtos divulgados no Instagram, Facebook e as melhores ofertas selecionadas.',
};

export default async function BioLinksPage() {
  const supabase = getSupabase();

  // 1. Produtos recentemente publicados nas redes sociais
  const { data: socialContents } = await supabase
    .from('marketing_content')
    .select('id, channel, hook, cta, product:products(id, name, slug, price, old_price, discount_percentage, image_url, rating, marketplace:marketplaces(name))')
    .eq('status', 'PUBLISHED')
    .order('published_at', { ascending: false })
    .limit(30);

  // Normalizar e desduplicar por produto
  const seenProductIds = new Set<string>();
  const socialProducts: any[] = [];

  for (const item of socialContents || []) {
    const p = (item as any).product;
    if (p && !seenProductIds.has(p.id)) {
      seenProductIds.add(p.id);
      socialProducts.push({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.price,
        oldPrice: p.old_price,
        discountPercentage: p.discount_percentage,
        imageUrl: p.image_url,
        rating: p.rating,
        marketplaceName: p.marketplace?.name || 'Loja Parceira',
        lastHook: item.hook,
      });
    }
  }

  // 2. Se houver poucos produtos nas redes, complementa com produtos em alta
  if (socialProducts.length < 12) {
    const trending = await getProducts({ isTrending: true, limit: 12 });
    for (const p of trending.products) {
      if (!seenProductIds.has(p.id)) {
        seenProductIds.add(p.id);
        socialProducts.push({
          id: p.id,
          name: p.name,
          slug: p.slug,
          price: p.price,
          oldPrice: p.oldPrice,
          discountPercentage: p.discountPercentage,
          imageUrl: p.imageUrl,
          rating: p.rating,
          marketplaceName: p.marketplace?.name || 'Loja Parceira',
        });
      }
    }
  }

  return (
    <div className="max-w-xl mx-auto py-6 px-4 space-y-6">
      {/* Header Bio */}
      <div className="text-center space-y-3">
        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 p-1 shadow-lg shadow-blue-500/20">
          <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
            <span className="text-2xl font-black bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
              VSE
            </span>
          </div>
        </div>

        <div>
          <h1 className="text-xl font-extrabold text-gray-900">VendaSemEstoque</h1>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            Achadinhos verificados, ofertas exclusivas e os menores preços dos maiores marketplaces.
          </p>
        </div>

        {/* Social Badges */}
        <div className="flex items-center justify-center gap-2 pt-1">
          <a
            href="https://instagram.com/vendasemestoque2026"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-xs hover:opacity-90 transition-opacity"
          >
            <Instagram className="w-3.5 h-3.5" />
            @vendasemestoque2026
          </a>
          <a
            href="https://facebook.com/1379471141916583"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-xs hover:bg-blue-700 transition-colors"
          >
            <Facebook className="w-3.5 h-3.5" />
            Página Facebook
          </a>
        </div>
      </div>

      {/* Botões de Acesso Rápido */}
      <div className="grid grid-cols-3 gap-2">
        <Link
          href="/ofertas"
          className="bg-white border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50/40 p-3 rounded-2xl text-center shadow-2xs transition-all group"
        >
          <Percent className="w-5 h-5 text-emerald-600 mx-auto mb-1 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold text-gray-800 block">Ofertas</span>
          <span className="text-[10px] text-gray-400">Até 70% OFF</span>
        </Link>
        <Link
          href="/mais-vendidos"
          className="bg-white border border-gray-200 hover:border-amber-500 hover:bg-amber-50/40 p-3 rounded-2xl text-center shadow-2xs transition-all group"
        >
          <Trophy className="w-5 h-5 text-amber-500 mx-auto mb-1 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold text-gray-800 block">Top Vendas</span>
          <span className="text-[10px] text-gray-400">Mais Populares</span>
        </Link>
        <Link
          href="/em-alta"
          className="bg-white border border-gray-200 hover:border-orange-500 hover:bg-orange-50/40 p-3 rounded-2xl text-center shadow-2xs transition-all group"
        >
          <Flame className="w-5 h-5 text-orange-500 mx-auto mb-1 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold text-gray-800 block">Em Alta</span>
          <span className="text-[10px] text-gray-400">Tendências</span>
        </Link>
      </div>

      {/* Lista de Produtos Dinâmica com Busca Instantânea */}
      <BioClientList products={socialProducts} />

      {/* Footer do Bio */}
      <div className="text-center pt-6 pb-8 border-t border-gray-200 text-xs text-gray-400 space-y-1">
        <p className="font-semibold text-gray-600">VendaSemEstoque.com.br</p>
        <p className="text-[11px]">Links verificados e redirecionamento seguro para lojas parceiras oficiais.</p>
      </div>
    </div>
  );
}
