import CategoryFilter from '@/components/CategoryFilter';
import ProductCard from '@/components/ProductCard';
import { getProducts, getCategories, getMarketplaces } from '@/services/productService';
import Link from 'next/link';
import { Search } from 'lucide-react';

type ProductCardProduct = Parameters<typeof ProductCard>[0]['product'];

export const runtime = 'edge';

interface ProductsPageProps {
  searchParams: Promise<{
    category?: string;
    q?: string;
    marketplace?: string;
    sortBy?: string;
    page?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const resolvedParams = await searchParams;

  const categorySlug = resolvedParams.category;
  const search = resolvedParams.q;
  const marketplaceSlug = resolvedParams.marketplace;
  const sortBy = (resolvedParams.sortBy as any) || 'relevance';
  const page = Number(resolvedParams.page || '1');

  const [productsData, categories, marketplaces] = await Promise.all([
    getProducts({
      categorySlug,
      search,
      marketplaceSlug,
      sortBy,
      page,
      limit: 12,
    }),
    getCategories(),
    getMarketplaces(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Catálogo Completo</h1>
          <p className="text-xs text-gray-500 mt-1">
            Exibindo {productsData.products.length} de {productsData.total} ofertas selecionadas
          </p>
        </div>
      </div>

      {/* Filtros */}
      <CategoryFilter categories={categories} marketplaces={marketplaces} />

      {/* Grid de Produtos */}
      {productsData.products.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-gray-200 space-y-3">
          <Search className="w-10 h-10 text-gray-400 mx-auto" />
          <h3 className="text-lg font-bold text-gray-800">Nenhum produto encontrado</h3>
          <p className="text-xs text-gray-500">Tente ajustar seus termos de busca ou remover os filtros aplicados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {productsData.products.map((product: ProductCardProduct) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {/* Paginação */}
      {productsData.totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-6">
          {Array.from({ length: productsData.totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/produtos?page=${p}${categorySlug ? `&category=${categorySlug}` : ''}${search ? `&q=${search}` : ''}${marketplaceSlug ? `&marketplace=${marketplaceSlug}` : ''}&sortBy=${sortBy}`}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                p === page
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
