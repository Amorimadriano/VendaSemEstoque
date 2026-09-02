import Hero from '@/components/Hero';
import ProductCard from '@/components/ProductCard';
import { getProducts, getCategories } from '@/services/productService';
import Link from 'next/link';
import { Flame, Trophy, Percent, ArrowRight, Grid, ShieldAlert } from 'lucide-react';

export const runtime = 'edge';
export const revalidate = 60; // ISR Revalidation

export default async function HomePage() {
  const [trendingData, bestSellerData, offerData, categories] = await Promise.all([
    getProducts({ isTrending: true, limit: 4 }),
    getProducts({ isBestSeller: true, limit: 4 }),
    getProducts({ sortBy: 'discount', limit: 4 }),
    getCategories(),
  ]);

  return (
    <div className="space-y-12">
      {/* Hero */}
      <Hero />

      {/* Seção 1: 🔥 Produtos em Alta */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-6 h-6 text-orange-500" />
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Produtos em Alta</h2>
          </div>
          <Link href="/em-alta" className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
            Ver todos <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {trendingData.products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Seção 2: 🏆 Mais Populares / Vendidos */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-500" />
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Mais Populares</h2>
          </div>
          <Link href="/mais-vendidos" className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
            Ver todos <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {bestSellerData.products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Seção 3: 💰 Melhores Ofertas */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Percent className="w-6 h-6 text-emerald-500" />
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Maiores Descontos</h2>
          </div>
          <Link href="/ofertas" className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
            Ver todos <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {offerData.products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Seção 4: Categorias em Destaque */}
      <section className="space-y-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Grid className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Explorar por Categoria</h2>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/produtos?category=${cat.slug}`}
              className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs hover:border-blue-500 hover:shadow-md transition-all text-center space-y-1 group"
            >
              <div className="text-sm font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                {cat.name}
              </div>
              <div className="text-xs text-gray-400">{cat._count.products} produtos</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
