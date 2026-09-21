import ProductCardSkeleton from '@/components/ProductCardSkeleton';

export default function Loading() {
  return (
    <div className="space-y-12">
      {/* Hero Skeleton */}
      <div className="w-full h-64 sm:h-80 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-3xl animate-pulse" />

      {/* Grid Skeleton */}
      <div className="space-y-4">
        <div className="h-7 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
