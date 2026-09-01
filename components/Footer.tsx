import Link from 'next/link';
import { ShoppingBag, ShieldCheck, HeartHandshake, Info } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 pt-12 pb-8 border-t border-gray-800 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          
          {/* Coluna 1: Sobre */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold text-white">
              <ShoppingBag className="w-6 h-6 text-blue-400" />
              <span>VendaSemEstoque</span>
            </Link>
            <p className="text-xs text-gray-400 leading-relaxed">
              Plataforma de curadoria dos melhores produtos da internet. Não mantemos estoque próprio. Redirecionamos você com segurança para as maiores lojas parceiras do Brasil e do mundo.
            </p>
          </div>

          {/* Coluna 2: Navegação */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Navegação</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/produtos" className="hover:text-white transition-colors">Catálogo de Produtos</Link></li>
              <li><Link href="/mais-vendidos" className="hover:text-white transition-colors">Produtos Mais Vendidos</Link></li>
              <li><Link href="/em-alta" className="hover:text-white transition-colors">Produtos em Alta</Link></li>
              <li><Link href="/ofertas" className="hover:text-white transition-colors">Maiores Descontos</Link></li>
            </ul>
          </div>

          {/* Coluna 3: Categorias */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Parceiros Oficiais</h4>
            <ul className="space-y-2 text-xs text-gray-400">
              <li>Amazon Brasil</li>
              <li>Mercado Livre</li>
              <li>Shopee</li>
              <li>AliExpress</li>
            </ul>
          </div>

          {/* Coluna 4: Transparência LGPD / Afiliados */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Transparência & LGPD</h4>
            <div className="bg-gray-800/80 p-3 rounded-lg border border-gray-700 text-xs space-y-2">
              <div className="flex items-center gap-1.5 text-blue-400 font-medium">
                <Info className="w-4 h-4 shrink-0" /> Aviso de Afiliado
              </div>
              <p className="text-gray-400 text-[11px] leading-normal">
                Podemos receber uma comissão de afiliado quando você conclui uma compra após clicar nos links do nosso site. Isso não altera o preço final para você.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6 text-center text-xs text-gray-500 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© 2026 VendaSemEstoque. Todos os direitos reservados.</p>
          <div className="flex gap-4">
            <span className="hover:text-gray-400 cursor-pointer">Política de Privacidade (LGPD)</span>
            <span className="hover:text-gray-400 cursor-pointer">Termos de Uso</span>
            <span className="hover:text-gray-400 cursor-pointer">Política de Cookie</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
