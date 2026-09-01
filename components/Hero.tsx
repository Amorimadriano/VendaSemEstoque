import Link from 'next/link';
import { Flame, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

export default function Hero() {
  return (
    <div className="relative bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-8 sm:p-12 mb-10 overflow-hidden shadow-xl">
      <div className="relative z-10 max-w-2xl space-y-6">
        
        <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 px-3 py-1 rounded-full text-xs text-blue-200 font-semibold backdrop-blur-sm">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>Curadoria Automática com Comissão Transparente</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
          As Melhores Ofertas Sem Estoque Próprio.
        </h1>

        <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
          Monitore e encontre produtos virais, em alta e mais vendidos das principais plataformas do mercado. Redirecionamento 100% seguro para concluir sua compra na loja parceira.
        </p>

        <div className="flex flex-wrap gap-4 pt-2">
          <Link
            href="/produtos"
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all"
          >
            <span>Explorar Catálogo</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/em-alta"
            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold py-3 px-6 rounded-xl text-sm flex items-center gap-2 backdrop-blur-xs transition-all"
          >
            <Flame className="w-4 h-4 text-orange-400" />
            <span>Ver Produtos em Alta</span>
          </Link>
        </div>
      </div>

      {/* Elementos decorativos */}
      <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-12 translate-y-12">
        <ShieldCheck className="w-96 h-96 text-white" />
      </div>
    </div>
  );
}
