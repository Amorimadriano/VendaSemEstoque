import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { getPartnerCatalog } from '@/services/partnerCatalog';
import { formatBRL, partnerPaymentConfig, partnerProductImages, publicSiteUrl } from '@/lib/partner';
import PartnerCheckoutForm from '@/components/PartnerCheckoutForm';
import PartnerProductGallery from '@/components/PartnerProductGallery';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Produto de vendedor parceiro' };

export default async function PartnerProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const [product] = await getPartnerCatalog(id);
  if (!product) notFound();
  const config = partnerPaymentConfig();
  const link = encodeURIComponent(`${publicSiteUrl()}/loja-parceiros/${product.id}`);
  return <div className="space-y-6">
    <Link href="/loja-parceiros" className="text-blue-700 underline">Voltar à vitrine</Link>
    <div className="grid md:grid-cols-2 gap-8">
      <PartnerProductGallery key={product.id} images={partnerProductImages(product)} name={product.name} />
      <section className="space-y-5">
        <p className="text-sm text-gray-600">Vendido e entregue por {product.seller.store_name}</p>
        <h1 className="text-3xl font-bold">{product.name}</h1>
        <p className="text-3xl font-bold text-blue-800">{formatBRL(product.price_cents)}</p>
        <p>Frete incluído para o Brasil · Entrega em até {product.delivery_days} dias corridos após a confirmação.</p>
        <p className="whitespace-pre-line text-gray-700">{product.description}</p>
        <div className="flex flex-wrap gap-4 text-blue-700 text-sm"><a href={`https://wa.me/?text=${encodeURIComponent(product.name)}%20${link}`} target="_blank" rel="noopener noreferrer" className="underline">Compartilhar no WhatsApp</a><a href={`https://www.facebook.com/sharer/sharer.php?u=${link}`} target="_blank" rel="noopener noreferrer" className="underline">Compartilhar no Facebook</a></div>
        {product.stock > 0 ? <PartnerCheckoutForm productId={product.id} enabled={config.enabled && config.configured} sandbox={config.mode === 'sandbox'} /> : <p className="rounded-xl bg-amber-50 p-4 text-amber-900">Produto temporariamente sem estoque.</p>}
      </section>
    </div>
    <section className="grid md:grid-cols-2 gap-6">
      <div className="rounded-xl border bg-white p-6"><h2 className="font-bold text-xl mb-3">Atendimento do vendedor</h2><p>{product.seller.legal_name}</p><p className="break-all">{product.seller.email}</p><p>{product.seller.phone}</p><p>{product.seller.business_address}</p></div>
      <div className="rounded-xl border bg-white p-6"><h2 className="font-bold text-xl mb-3">Devoluções e reembolsos</h2><p className="whitespace-pre-line">{product.return_policy}</p><p className="text-sm mt-4">As condições do vendedor não podem restringir direitos previstos em lei. O pagamento é processado pelo Mercado Pago; a plataforma recebe uma comissão. <Link href="/parceiros/termos" className="underline text-blue-700">Veja os termos.</Link></p></div>
    </section>
  </div>;
}
