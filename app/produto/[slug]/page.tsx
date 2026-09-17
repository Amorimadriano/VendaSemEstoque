import { getProductBySlug } from '@/services/productService';
import ProductCard from '@/components/ProductCard';
import PriceAlertModal from '@/components/PriceAlertModal';
import { formatDate } from '@/lib/dateUtils';
import { notFound } from 'next/navigation';
import { Star, ShieldCheck, ExternalLink, Info, CheckCircle2, TrendingUp, Sparkles, ShoppingBag, ArrowRight } from 'lucide-react';
import Link from 'next/link';

type ProductCardProduct = Parameters<typeof ProductCard>[0]['product'];

export const runtime = 'edge';

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps) {
  const { slug } = await params;
  const result = await getProductBySlug(slug);
  if (!result) return { title: 'Produto Não Encontrado' };

  const { product } = result;
  const baseUrl = (process.env.SITE_URL || 'https://venda-sem-estoque.pages.dev').replace(/\/$/, '');
  const title = `${product.name} | Menor Preço e Ofertas | VendaSemEstoque`;
  const description = product.description?.slice(0, 160) || `Confira o preço e condições de ${product.name} na loja ${product.marketplace?.name || 'parceira'}.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${baseUrl}/produto/${product.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${baseUrl}/produto/${product.slug}`,
      siteName: 'VendaSemEstoque',
      images: [
        {
          url: product.imageUrl,
          width: 800,
          height: 800,
          alt: product.name,
        },
      ],
      locale: 'pt_BR',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [product.imageUrl],
    },
  };
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const result = await getProductBySlug(slug);

  if (!result) {
    notFound();
  }

  const { product, similarProducts } = result;
  const baseUrl = (process.env.SITE_URL || 'https://venda-sem-estoque.pages.dev').replace(/\/$/, '');

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

  let images: string[] = [];
  try {
    images = JSON.parse(product.images);
  } catch (e) {
    images = [product.imageUrl];
  }

  // Menor preço registrado no histórico
  const minHistoricalPrice = product.priceHistories.length > 0
    ? Math.min(product.price, ...product.priceHistories.map((h: any) => h.price).filter((p: number) => p > 0))
    : product.price;

  const isLowestPrice = product.price <= minHistoricalPrice;

  // Schema.org JSON-LD para indexação e Rich Snippets no Google
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: images.length > 0 ? images : [product.imageUrl],
    description: product.description,
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'BRL',
      availability: 'https://schema.org/InStock',
      url: `${baseUrl}/go/${product.id}`,
      seller: {
        '@type': 'Organization',
        name: product.marketplace?.name || 'VendaSemEstoque',
      },
    },
    aggregateRating: product.rating && product.reviewCount > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: Math.max(1, product.reviewCount),
      bestRating: 5,
      worstRating: 1,
    } : undefined,
  };

  return (
    <div className="space-y-12">
      {/* Schema.org JSON-LD Injection */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      {/* Breadcrumb */}
      <nav className="text-xs text-gray-500 flex items-center gap-2">
        <Link href="/" className="hover:text-blue-600">Home</Link>
        <span>/</span>
        <Link href={`/produtos?category=${product.category.slug}`} className="hover:text-blue-600">
          {product.category.name}
        </Link>
        <span>/</span>
        <span className="text-gray-800 font-medium truncate max-w-xs">{product.name}</span>
      </nav>

      {/* Grid Principal do Produto */}
      <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-10 shadow-sm grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        {/* Imagens */}
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 flex items-center justify-center min-h-[350px]">
            <img
              src={images[0] ? `/api/images?src=${encodeURIComponent(images[0])}` : `/api/images?src=${encodeURIComponent(product.imageUrl)}`}
              alt={product.name}
              className="max-h-80 object-contain hover:scale-105 transition-transform duration-300"
              referrerPolicy="no-referrer"
            />
          </div>

          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {images.map((imgUrl, idx) => (
                <div key={idx} className="w-16 h-16 rounded-xl border border-gray-200 p-1 shrink-0">
                  <img
                    src={`/api/images?src=${encodeURIComponent(imgUrl)}`}
                    alt={`${product.name} thumbnail ${idx}`}
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Informações e Ações */}
        <div className="space-y-6 flex flex-col justify-between">
          <div className="space-y-3">
            
            {/* Badges e Loja */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-md border border-blue-200">
                Oferecido por: {product.marketplace.name}
              </span>
              {product.brand && (
                <span className="bg-gray-100 text-gray-700 text-xs font-semibold px-2.5 py-1 rounded-md">
                  Marca: {product.brand}
                </span>
              )}
            </div>

            {/* Nome */}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">
              {product.name}
            </h1>

            {/* Avaliações e Score */}
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <div className="flex items-center gap-1 text-amber-500 font-bold">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>{product.rating.toFixed(1)}</span>
              </div>
              <span>•</span>
              <span className="text-xs text-gray-500">{product.reviewCount} avaliações na loja de origem</span>
            </div>

            {/* Caixa de Preço */}
            <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 space-y-2">
              {formattedOldPrice && (
                <div className="text-xs text-gray-400 line-through">
                  De {formattedOldPrice} por
                </div>
              )}
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-black text-gray-900">{formattedPrice}</span>
                {product.discountPercentage && product.discountPercentage > 0 ? (
                  <span className="bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {product.discountPercentage}% OFF
                  </span>
                ) : null}
              </div>

              {formattedCommission && (
                <div className="text-xs text-emerald-700 font-medium pt-1">
                  💡 Comissão estimada de afiliados: <strong className="font-bold">{formattedCommission}</strong>
                </div>
              )}
            </div>

            {/* Descrição */}
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Descrição do Produto</h4>
              <p className="text-xs text-gray-600 leading-relaxed">{product.description}</p>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="space-y-3 pt-4 border-t border-gray-100">
            <a
              href={`/go/${product.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-base py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 hover:shadow-xl transition-all"
            >
              <span>COMPRAR NA PLATAFORMA PARCEIRA ({product.marketplace.name.toUpperCase()})</span>
              <ExternalLink className="w-5 h-5" />
            </a>

            <PriceAlertModal
              productId={product.id}
              productName={product.name}
              currentPrice={product.price}
            />

            {/* Aviso transparente de afiliados */}
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-[11px] text-gray-500 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <span>
                <strong>Compra Segura:</strong> Ao clicar no botão acima, você será direcionado para o site oficial da <strong>{product.marketplace.name}</strong> para concluir sua compra. Nossa plataforma pode receber uma comissão caso a venda seja efetuada.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Histórico de Preços & Comparativo */}
      {product.priceHistories.length > 0 && (
        <section className="bg-white p-6 rounded-2xl border border-gray-200 space-y-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-bold text-gray-900">Histórico e Tendência de Preço</h3>
            </div>
            {isLowestPrice && (
              <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Melhor preço registrado!
              </span>
            )}
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {product.priceHistories.map((ph: any, i: number) => {
              const isRecordLowest = ph.price === minHistoricalPrice;
              return (
                <div
                  key={i}
                  className={`p-3 rounded-xl border text-center min-w-[130px] transition-all ${
                    isRecordLowest
                      ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-300'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="text-[10px] text-gray-500 font-medium">
                    {formatDate(ph.recordedAt)}
                  </div>
                  <div className="text-sm font-extrabold text-gray-900 mt-0.5">
                    R$ {ph.price.toFixed(2)}
                  </div>
                  {isRecordLowest && (
                    <span className="text-[9px] font-bold text-emerald-700 block mt-1">
                      Menor valor
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Comparativo de Lojas / Alternativas Recomendadas */}
      {similarProducts.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-blue-600" />
              <h3 className="text-xl font-bold text-gray-900">Outras Opções em {product.category.name}</h3>
            </div>
            <Link
              href={`/produtos?category=${product.category.slug}`}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Ver categoria completa <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {similarProducts.map((simProd: ProductCardProduct) => (
              <ProductCard key={simProd.id} product={simProd} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
