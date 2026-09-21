import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SupportChat from '@/components/SupportChat';

const inter = Inter({ subsets: ['latin'] });
const siteUrl = (process.env.SITE_URL || 'https://venda-sem-estoque.pages.dev').replace(/\/$/, '');

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'VendaSemEstoque | As Melhores Ofertas Sem Estoque Próprio',
    template: '%s | VendaSemEstoque',
  },
  description: 'Catálogo de produtos virais, em alta e mais vendidos com links oficiais de afiliados e comissão transparente.',
  keywords: ['venda sem estoque', 'afiliados', 'ofertas', 'amazon', 'shopee', 'aliexpress', 'melhores preços', 'compras online'],
  authors: [{ name: 'VendaSemEstoque' }],
  creator: 'VendaSemEstoque',
  publisher: 'VendaSemEstoque',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: siteUrl,
    siteName: 'VendaSemEstoque',
    title: 'VendaSemEstoque | As Melhores Ofertas Sem Estoque Próprio',
    description: 'Catálogo de produtos virais, em alta e mais vendidos com links oficiais de afiliados e comissão transparente.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VendaSemEstoque | As Melhores Ofertas Sem Estoque Próprio',
    description: 'Catálogo de produtos virais, em alta e mais vendidos com links oficiais de afiliados e comissão transparente.',
  },
  alternates: {
    canonical: siteUrl,
  },
  verification: {
    google: 'googlee518f3fb9cb4fb3a',
  },
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
        <SupportChat />
      </body>
    </html>
  );
}
