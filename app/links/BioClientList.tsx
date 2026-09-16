'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, ExternalLink, Star, ArrowRight, ShoppingBag } from 'lucide-react';

export interface BioProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  oldPrice?: number | null;
  discountPercentage?: number | null;
  imageUrl: string;
  rating?: number;
  marketplaceName: string;
  lastHook?: string;
}

export default function BioClientList({ products }: { products: BioProduct[] }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.marketplaceName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar produto por nome ou loja..."
          className="w-full bg-white border border-gray-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-gray-900 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-2xs transition-all"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 hover:text-gray-600"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Título da Seção */}
      <div className="flex items-center justify-between text-xs text-gray-500 px-1">
        <span className="font-bold text-gray-800 flex items-center gap-1.5">
          <ShoppingBag className="w-4 h-4 text-blue-600" />
          {searchTerm ? `Resultados (${filtered.length})` : 'Produtos Divulgados & Ofertas Recentes'}
        </span>
        <span className="text-[11px] text-gray-400">{filtered.length} itens</span>
      </div>

      {/* Lista de Cards Estilo Linktree de Alta Conversão */}
      <div className="space-y-3">
        {filtered.map((product) => {
          const formattedPrice = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }).format(product.price);

          return (
            <div
              key={product.id}
              className="bg-white border border-gray-200 rounded-2xl p-3 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all flex items-center gap-3.5 group"
            >
              {/* Imagem */}
              <div className="w-20 h-20 bg-gray-50 rounded-xl border border-gray-100 shrink-0 p-1 flex items-center justify-center overflow-hidden">
                <img
                  src={`/api/images?src=${encodeURIComponent(product.imageUrl)}`}
                  alt={product.name}
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Informações */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
                    {product.marketplaceName}
                  </span>
                  {product.discountPercentage && product.discountPercentage > 0 ? (
                    <span className="bg-emerald-600 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-sm">
                      -{product.discountPercentage}%
                    </span>
                  ) : null}
                </div>

                <h3 className="text-xs font-bold text-gray-900 truncate leading-snug">
                  {product.name}
                </h3>

                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-black text-gray-900">{formattedPrice}</span>
                  {product.rating ? (
                    <span className="text-[10px] text-amber-500 font-bold flex items-center gap-0.5">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {product.rating.toFixed(1)}
                    </span>
                  ) : null}
                </div>

                {/* Botões de Ação */}
                <div className="flex items-center gap-2 pt-1">
                  <a
                    href={`/go/${product.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] py-1.5 px-3 rounded-lg flex items-center justify-center gap-1 shadow-xs transition-colors"
                  >
                    <span>Ver Oferta</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <Link
                    href={`/produto/${product.slug}`}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-[11px] py-1.5 px-2.5 rounded-lg transition-colors"
                    title="Ver detalhes"
                  >
                    Detalhes
                  </Link>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-8 bg-gray-50 rounded-2xl border border-gray-200 text-xs text-gray-500 space-y-1">
            <p className="font-bold text-gray-700">Nenhum produto encontrado</p>
            <p>Tente buscar por outro termo ou limpe a busca.</p>
          </div>
        )}
      </div>
    </div>
  );
}
