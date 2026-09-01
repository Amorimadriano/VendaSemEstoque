import ProductCard from '@/components/ProductCard';
import { getProducts } from '@/services/productService';
import { Flame } from 'lucide-react';

export const revalidate = 60;

export default async function TrendingPage() {
  const data = await getProducts({ isTrending: true, limit: 16 });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Flame className="w-8 h-8 text-orange-500" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Produtos Em Alta / Tendência</h1>
          <p className="text-xs text-gray-500">Produtos com crescimento rápido de engajamento e procura</p>
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
