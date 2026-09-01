import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'VendaSemEstoque | As Melhores Ofertas Sem Estoque Próprio',
  description: 'Catálogo de produtos virais, em alta e mais vendidos com links oficiais de afiliados e comissão transparente.',
  keywords: ['venda sem estoque', 'afiliados', 'ofertas', 'amazon', 'mercado livre', 'shopee', 'aliexpress'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={inter.className}>
      <body className="bg-gray-50 text-gray-900 min-h-screen flex flex-col antialiased">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
