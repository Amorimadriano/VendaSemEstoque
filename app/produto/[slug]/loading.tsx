export default function Loading() {
  return (
    <div className="space-y-12 animate-pulse pb-12">
      {/* Breadcrumb Skeleton */}
      <div className="h-4 w-64 bg-gray-200 rounded" />

      {/* Main Product Card Skeleton */}
      <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-10 shadow-sm grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Imagem Skeleton */}
        <div className="space-y-4">
          <div className="w-full h-80 bg-gray-200 rounded-2xl" />
          <div className="flex gap-3">
            <div className="w-16 h-16 bg-gray-200 rounded-xl" />
            <div className="w-16 h-16 bg-gray-200 rounded-xl" />
            <div className="w-16 h-16 bg-gray-200 rounded-xl" />
          </div>
        </div>

        {/* Info Skeleton */}
        <div className="space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="h-5 w-36 bg-gray-200 rounded" />
            <div className="h-8 w-full bg-gray-200 rounded" />
            <div className="h-8 w-3/4 bg-gray-200 rounded" />
            <div className="h-4 w-40 bg-gray-200 rounded" />
            <div className="h-24 w-full bg-gray-100 rounded-2xl border border-gray-200" />
            <div className="h-20 w-full bg-gray-200 rounded" />
          </div>
          <div className="h-14 w-full bg-gray-300 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
