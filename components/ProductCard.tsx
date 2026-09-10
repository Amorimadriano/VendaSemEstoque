'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ImageOff, Star, Flame, Trophy, ExternalLink } from 'lucide-react';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    description: string;
    price: number;
    oldPrice?: number | null;
    discountPercentage?: number | null;
    rating: number;
    reviewCount: number;
    imageUrl: string;
    isBestSeller?: boolean;
    isTrending?: boolean;
    commissionValue?: number | null;
    affiliateUrl?: string | null;
    marketplace?: {
      name: string;
      slug: string;
      logoUrl?: string | null;
    } | null;
  };
}

export default function ProductCard({ product }: ProductCardProps) {
  const [imageMode, setImageMode] = useState<'proxy' | 'direct' | 'failed'>('proxy');
  const formattedPrice = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(product.price);

  const formattedOldPrice = product.oldPrice
    ? new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(product.oldPrice)
    : null;

  const formattedCommission = product.commissionValue
    ? new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(product.commissionValue)
    : null;

  const proxyImageSource = product.imageUrl ? `/api/images?src=${encodeURIComponent(product.imageUrl)}` : '';
  const imageSource = imageMode === 'direct' ? product.imageUrl : proxyImageSource;

  useEffect(() => {
    setImageMode(product.imageUrl ? 'proxy' : 'failed');
  }, [product.imageUrl]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group">
      
      {/* Top badges */}
      <div className="relative h-52 shrink-0 p-3 bg-gray-50 flex items-center justify-between overflow-hidden">
        
        {/* Badges de destaque */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
          {product.isBestSeller && (
            <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
              <Trophy className="w-3 h-3" /> Mais Vendido
            </span>
          )}
          {product.isTrending && (
            <span className="bg-gradient-to-r from-orange-500 to-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
              <Flame className="w-3 h-3" /> Em Alta
            </span>
          )}
          {product.discountPercentage && product.discountPercentage > 0 ? (
            <span className="bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-sm">
              -{product.discountPercentage}%
            </span>
          ) : null}
        </div>

        {/* Marketplace Label */}
        {product.marketplace && (
          <span className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm border border-gray-200 text-gray-700 text-[10px] font-semibold px-2 py-0.5 rounded-md z-10 shadow-xs">
            {product.marketplace.name}
          </span>
        )}

        {/* Imagem do Produto */}
        <Link href={`/produto/${product.slug}`} className="flex h-full w-full items-center justify-center pt-6">
          {imageMode === 'failed' ? (
            <div className="flex h-36 w-full flex-col items-center justify-center gap-2 text-gray-400"><ImageOff className="h-8 w-8" /><span className="text-xs">Imagem indisponível</span></div>
          ) : (
            <img
              src={imageSource}
              alt=""
              className="h-36 max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setImageMode((current) => current === 'proxy' ? 'direct' : 'failed')}
            />
          )}
        </Link>
      </div>

      {/* Conteúdo */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
        <div>
          {/* Avaliação */}
          <div className="flex items-center gap-1.5 text-xs text-amber-500 mb-1">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${
                    i < Math.floor(product.rating)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="font-semibold text-gray-800">{product.rating.toFixed(1)}</span>
            <span className="text-gray-400 text-[11px]">({product.reviewCount} avaliações)</span>
          </div>

          {/* Nome */}
          <Link href={`/produto/${product.slug}`}>
            <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 hover:text-blue-600 transition-colors leading-snug">
              {product.name}
            </h3>
          </Link>
        </div>

        {/* Preço e Comissão */}
        <div className="space-y-1.5 pt-2 border-t border-gray-100">
          {formattedOldPrice && (
            <div className="text-xs text-gray-400 line-through">
              De {formattedOldPrice}
            </div>
          )}
          <div className="text-lg font-bold text-gray-900 flex items-baseline gap-1">
            <span className="text-xs text-gray-500 font-normal">Por</span>
            {formattedPrice}
          </div>

          {formattedCommission && (
            <div className="bg-emerald-50 text-emerald-700 text-[11px] font-medium px-2 py-0.5 rounded border border-emerald-200/60 inline-block">
              Comissão estimada: <strong className="font-semibold">{formattedCommission}</strong>
            </div>
          )}
        </div>

        {/* Botão Ver Oferta com Tracking (/go/[id]) */}
        <a
          href={product.affiliateUrl || `/go/${product.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full mt-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all"
        >
          <span>VER OFERTA</span>
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
