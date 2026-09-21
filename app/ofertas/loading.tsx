import ProductCardSkeleton from '@/components/ProductCardSkeleton';

export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2 animate-pulse">
        <div className="h-8 w-60 bg-gray-200 rounded" />
        <div className="h-4 w-96 bg-gray-200 rounded" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
