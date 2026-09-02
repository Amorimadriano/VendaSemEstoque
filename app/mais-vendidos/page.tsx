import ProductCard from '@/components/ProductCard';
import { getProducts } from '@/services/productService';
import { Trophy } from 'lucide-react';

export const runtime = 'edge';
export const revalidate = 60;

export default async function BestSellersPage() {
  const data = await getProducts({ isBestSeller: true, limit: 16 });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Trophy className="w-8 h-8 text-amber-500" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Produtos Mais Vendidos</h1>
          <p className="text-xs text-gray-500">Ranking baseado em popularidade e volume de busca nas lojas parceiras</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {data.products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
