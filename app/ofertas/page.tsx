import ProductCard from '@/components/ProductCard';
import { getProducts } from '@/services/productService';
import { Percent } from 'lucide-react';

export const revalidate = 60;

export default async function OffersPage() {
  const data = await getProducts({ sortBy: 'discount', limit: 16 });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Percent className="w-8 h-8 text-emerald-500" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Maiores Descontos e Ofertas</h1>
          <p className="text-xs text-gray-500">Produtos com as maiores reduções de preço ativas</p>
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
