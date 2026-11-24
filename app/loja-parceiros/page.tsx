import Link from 'next/link';
import { getPartnerCatalog } from '@/services/partnerCatalog';
import { formatBRL } from '@/lib/partner';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Produtos dos parceiros', description: 'Conheça produtos de vendedores analisados pela VendaSemEstoque.' };

export default async function PartnerCatalogPage() {
  const products = await getPartnerCatalog();
  return <div className="space-y-7">
    <header className="rounded-2xl bg-blue-950 text-white p-8"><h1 className="text-3xl font-bold mb-3">Vitrine dos parceiros</h1><p>Produtos de vendedores independentes, com anúncios analisados pela plataforma. Cada vendedor cuida da entrega e do atendimento.</p><Link href="/parceiros" className="inline-block mt-4 text-blue-200 underline">Tem uma loja? Venda com a gente</Link></header>
    {!products.length && <div className="rounded-xl border bg-white p-8"><h2 className="text-xl font-bold mb-2">Estamos preparando as primeiras lojas</h2><p>Novos produtos aparecerão aqui após a aprovação. As ofertas de afiliados continuam disponíveis no catálogo principal.</p><Link href="/produtos" className="inline-block mt-4 text-blue-700 underline">Ver ofertas atuais</Link></div>}
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">{products.map((product) => <Link key={product.id} href={`/loja-parceiros/${product.id}`} className="rounded-2xl border bg-white overflow-hidden hover:shadow-lg transition-shadow">
      {/* External seller images are displayed without proxying or fetching them server-side. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={product.image_url} alt={product.name} loading="lazy" referrerPolicy="no-referrer" className="w-full aspect-square object-contain p-4" />
      <div className="p-5 space-y-2"><p className="text-xs text-gray-500">{product.seller.store_name}</p><h2 className="font-semibold">{product.name}</h2><p className="text-xl text-blue-800 font-bold">{formatBRL(product.price_cents)}</p><p className="text-xs text-gray-600">Frete incluído · Até {product.delivery_days} dias corridos</p>{product.stock < 1 && <p className="text-red-700 text-sm">Sem estoque</p>}</div>
    </Link>)}</div>
  </div>;
}
