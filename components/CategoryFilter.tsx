'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { SlidersHorizontal, ArrowUpDown } from 'lucide-react';

interface CategoryFilterProps {
  categories: Array<{ id: string; name: string; slug: string; _count?: { products: number } }>;
  marketplaces: Array<{ id: string; name: string; slug: string }>;
}

export default function CategoryFilter({ categories, marketplaces }: CategoryFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentCategory = searchParams.get('category') || '';
  const currentMarketplace = searchParams.get('marketplace') || '';
  const currentSort = searchParams.get('sortBy') || 'relevance';

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1');
    router.push(`/produtos?${params.toString()}`);
  };

  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs mb-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        
        {/* Categorias Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none max-w-full">
          <button
            onClick={() => updateFilter('category', '')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              !currentCategory
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todas as Categorias
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => updateFilter('category', cat.slug)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                currentCategory === cat.slug
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Filtros Secundários e Ordenação */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Marketplace Filter */}
          <select
            value={currentMarketplace}
            onChange={(e) => updateFilter('marketplace', e.target.value)}
            className="bg-gray-50 border border-gray-300 text-gray-800 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas as Lojas</option>
            {marketplaces.map((m) => (
              <option key={m.id} value={m.slug}>
                {m.name}
              </option>
            ))}
          </select>

          {/* Sort By */}
          <select
            value={currentSort}
            onChange={(e) => updateFilter('sortBy', e.target.value)}
            className="bg-gray-50 border border-gray-300 text-gray-800 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="relevance">Mais Relevantes / Score</option>
            <option value="popularity">Mais Populares</option>
            <option value="discount">Maior Desconto</option>
            <option value="price_asc">Menor Preço</option>
            <option value="price_desc">Maior Preço</option>
            <option value="rating">Melhor Avaliação</option>
            <option value="commission">Maior Comissão</option>
          </select>
        </div>
      </div>
    </div>
  );
}
