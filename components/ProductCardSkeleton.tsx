export default function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-4 animate-pulse">
      {/* Imagem Skeleton */}
      <div className="w-full h-48 bg-gray-200 rounded-xl" />

      {/* Tags / Marketplace */}
      <div className="flex gap-2">
        <div className="h-4 w-20 bg-gray-200 rounded" />
        <div className="h-4 w-12 bg-gray-200 rounded" />
      </div>

      {/* Título */}
      <div className="space-y-2">
        <div className="h-4 w-full bg-gray-200 rounded" />
        <div className="h-4 w-3/4 bg-gray-200 rounded" />
      </div>

      {/* Preço e Botão */}
      <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
        <div className="space-y-1">
          <div className="h-3 w-12 bg-gray-200 rounded" />
          <div className="h-6 w-24 bg-gray-200 rounded" />
        </div>
        <div className="h-9 w-24 bg-gray-200 rounded-xl" />
      </div>
    </div>
  );
}
