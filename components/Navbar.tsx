'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Search, Flame, Trophy, Percent, Tag, LayoutDashboard, ShoppingBag, Menu, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/produtos?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      {/* Top Banner Transparência */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white text-xs py-1.5 px-4 text-center">
        <span>✨ Plataforma 100% transparente de ofertas & afiliados. Sem estoque próprio.</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-blue-600 shrink-0">
            <ShoppingBag className="w-7 h-7 text-blue-600" />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              VendaSemEstoque
            </span>
          </Link>

          {/* Busca */}
          <form onSubmit={handleSearch} className="flex-1 max-w-xl relative hidden md:block">
            <input
              type="text"
              placeholder="Buscar produtos, marcas, eletrônicos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-100 border border-gray-300 rounded-full py-2 pl-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-gray-800"
            />
            <button type="submit" className="absolute right-3 top-2.5 text-gray-500 hover:text-blue-600">
              <Search className="w-4 h-4" />
            </button>
          </form>

          {/* Nav Links Desktop */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-gray-700">
            <Link href="/produtos" className="hover:text-blue-600 flex items-center gap-1">
              <Tag className="w-4 h-4 text-blue-500" /> Catálogo
            </Link>

            <Link href="/mais-vendidos" className="hover:text-blue-600 flex items-center gap-1">
              <Trophy className="w-4 h-4 text-amber-500" /> Mais Vendidos
            </Link>

            <Link href="/em-alta" className="hover:text-blue-600 flex items-center gap-1">
              <Flame className="w-4 h-4 text-orange-500" /> Em Alta
            </Link>

            <Link href="/ofertas" className="hover:text-blue-600 flex items-center gap-1">
              <Percent className="w-4 h-4 text-green-500" /> Ofertas
            </Link>

            <Link
              href="/admin"
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold border border-gray-300 transition-colors"
            >
              <LayoutDashboard className="w-3.5 h-3.5" /> Painel Admin
            </Link>
          </nav>

          {/* Menu Mobile Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 text-gray-600 hover:text-blue-600"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Busca Mobile */}
        <div className="pb-3 md:hidden">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              placeholder="Buscar ofertas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-100 border border-gray-300 rounded-full py-2 pl-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
            />
            <button type="submit" className="absolute right-3 top-2.5 text-gray-500">
              <Search className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Menu Mobile Dropdown */}
      {isMenuOpen && (
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 pt-2 pb-4 space-y-3 font-medium text-gray-700">
          <Link href="/produtos" onClick={() => setIsMenuOpen(false)} className="block py-2 border-b border-gray-100">
            Catálogo de Produtos
          </Link>
          <Link href="/mais-vendidos" onClick={() => setIsMenuOpen(false)} className="block py-2 border-b border-gray-100">
            Mais Vendidos
          </Link>
          <Link href="/em-alta" onClick={() => setIsMenuOpen(false)} className="block py-2 border-b border-gray-100">
            Em Alta
          </Link>
          <Link href="/ofertas" onClick={() => setIsMenuOpen(false)} className="block py-2 border-b border-gray-100">
            Ofertas Imbatíveis
          </Link>
          <Link
            href="/admin"
            onClick={() => setIsMenuOpen(false)}
            className="block py-2 text-blue-600 font-semibold"
          >
            Painel Administrativo
          </Link>
        </div>
      )}
    </header>
  );
}
