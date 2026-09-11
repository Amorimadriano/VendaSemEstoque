'use client';

export const runtime = 'edge';

import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Package,
  MousePointerClick,
  DollarSign,
  TrendingUp,
  Plus,
  RefreshCw,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Trash2,
  Search,
} from 'lucide-react';
import MarketingAgent from '@/components/MarketingAgent';
import ContentApprovalQueue from '@/components/ContentApprovalQueue';
import MarketplaceSyncStatus from '@/components/MarketplaceSyncStatus';
import OperationsHealth from '@/components/OperationsHealth';

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [marketplaces, setMarketplaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productMarketplace, setProductMarketplace] = useState('');
  const [productStatus, setProductStatus] = useState('');
  const [productPage, setProductPage] = useState(1);

  // Form state para novo produto
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    categoryId: '',
    marketplaceId: '',
    brand: '',
    imageUrl: '',
    price: '',
    cost: '',
    platformFees: '',
    shippingCost: '',
    marketingCost: '',
    otherCosts: '',
    oldPrice: '',
    commissionPercentage: '',
    externalProductId: '',
    originalUrl: '',
    affiliateUrl: '',
    productType: '',
    supplierInfo: '',
    targetAudience: '',
    keyBenefits: '',
    keyObjections: '',
    competitionNotes: '',
    deliveryTime: '',
    returnPolicy: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resMetrics, resProducts, resCats, resMarkets] = await Promise.all([
        fetch('/api/admin/metrics'),
        fetch('/api/products?limit=200'),
        fetch('/api/categories'),
        fetch('/api/marketplaces'),
      ]);

      const dataMetrics = await resMetrics.json();
      const dataProducts = await resProducts.json();
      const dataCats = await resCats.json();
      const dataMarkets = await resMarkets.json();

      setMetrics(dataMetrics.summary ? dataMetrics : {
        summary: {
          totalProducts: 0,
          activeProducts: 0,
          trendingProducts: 0,
          bestSellerProducts: 0,
          totalClicks: 0,
          totalConversions: 0,
          conversionRate: 0,
          totalSaleValue: 0,
          commissions: { total: 0, pending: 0, approved: 0, paid: 0 },
        },
      });
      setProducts(dataProducts.products || []);
      setCategories(dataCats || []);
      setMarketplaces(dataMarkets || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setProductPage(1);
  }, [productSearch, productMarketplace, productStatus]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newProduct,
          price: parseFloat(newProduct.price),
          cost: newProduct.cost ? parseFloat(newProduct.cost) : null,
          platformFees: newProduct.platformFees ? parseFloat(newProduct.platformFees) : null,
          shippingCost: newProduct.shippingCost ? parseFloat(newProduct.shippingCost) : null,
          marketingCost: newProduct.marketingCost ? parseFloat(newProduct.marketingCost) : null,
          otherCosts: newProduct.otherCosts ? parseFloat(newProduct.otherCosts) : null,
          oldPrice: newProduct.oldPrice ? parseFloat(newProduct.oldPrice) : null,
          commissionPercentage: parseFloat(newProduct.commissionPercentage),
          categoryId: newProduct.categoryId || categories[0]?.id,
          marketplaceId: newProduct.marketplaceId || marketplaces[0]?.id,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setNewProduct({
          name: '',
          description: '',
          categoryId: '',
          marketplaceId: '',
          brand: '',
          imageUrl: '',
          price: '',
          cost: '',
          platformFees: '',
          shippingCost: '',
          marketingCost: '',
          otherCosts: '',
          oldPrice: '',
          commissionPercentage: '',
          externalProductId: '',
          originalUrl: '',
          affiliateUrl: '',
          productType: '',
          supplierInfo: '',
          targetAudience: '',
          keyBenefits: '',
          keyObjections: '',
          competitionNotes: '',
          deliveryTime: '',
          returnPolicy: '',
        });
        fetchData();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente excluir o produto "${name}"?`)) return;
    try {
      const res = await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedProductIds((current) => current.filter((item) => item !== id));
        fetchData();
      } else {
        alert('Erro ao excluir produto.');
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao excluir produto.');
    }
  };

  const toggleSelectAll = () => {
    if (selectedProductIds.length === products.length && products.length > 0) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(products.map((p) => p.id));
    }
  };

  const toggleSelectProduct = (id: string) => {
    setSelectedProductIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const handleDeleteBulk = async () => {
    if (!selectedProductIds.length) return;
    const count = selectedProductIds.length;
    if (!confirm(`Deseja realmente excluir os ${count} produtos selecionados em lote?`)) return;

    setIsDeletingBulk(true);
    try {
      const res = await fetch('/api/products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedProductIds }),
      });

      if (res.ok) {
        setSelectedProductIds([]);
        await fetchData();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || 'Erro ao excluir produtos em lote.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir produtos em lote.');
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const filteredProducts = products.filter((product) => {
    const search = productSearch.trim().toLowerCase();
    return (!search || product.name?.toLowerCase().includes(search) || product.externalProductId?.toLowerCase().includes(search))
      && (!productMarketplace || product.marketplace?.slug === productMarketplace)
      && (!productStatus || product.status === productStatus);
  });
  const productPageSize = 15;
  const productPageCount = Math.max(1, Math.ceil(filteredProducts.length / productPageSize));
  const visibleProducts = filteredProducts.slice((productPage - 1) * productPageSize, productPage * productPageSize);

  if (loading || !metrics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm font-semibold text-gray-600">Carregando dados do painel administrativo...</p>
      </div>
    );
  }

  const { summary } = metrics;

  return (
    <div className="space-y-8">
      
      {/* Header Admin */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <LayoutDashboard className="w-7 h-7 text-blue-600" />
            Painel Administrativo VendaSemEstoque
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Gerenciamento de produtos, tracking de afiliados, métricas e comissões.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-2 bg-white border border-gray-300 rounded-xl text-gray-600 hover:text-blue-600 shadow-xs"
            title="Atualizar dados"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Novo Produto Manual
          </button>
        </div>
      </div>

      {/* Grid de Métricas Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Produtos */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Total de Produtos</span>
            <Package className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-gray-900">{summary.totalProducts}</div>
          <div className="text-xs text-gray-500">
            <strong className="text-emerald-600">{summary.activeProducts}</strong> ativos • {summary.trendingProducts} em alta
          </div>
        </div>

        {/* Card 2: Cliques */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Cliques Gravados</span>
            <MousePointerClick className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-gray-900">{summary.totalClicks}</div>
          <div className="text-xs text-gray-500">
            Taxa de conversão: <strong className="text-indigo-600">{summary.conversionRate}%</strong>
          </div>
        </div>

        {/* Card 3: Conversões */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Vendas Atribuídas</span>
            <ShoppingBag className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-gray-900">{summary.totalConversions}</div>
          <div className="text-xs text-gray-500">
            Total em Vendas: <strong>R$ {summary.totalSaleValue.toFixed(2)}</strong>
          </div>
        </div>

        {/* Card 4: Comissões */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Comissão Estimada</span>
            <DollarSign className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600">R$ {summary.commissions.total.toFixed(2)}</div>
          <div className="text-xs text-gray-500">
            Pendente: R$ {summary.commissions.pending.toFixed(2)} • Aprovado: R$ {summary.commissions.approved.toFixed(2)}
          </div>
        </div>
      </div>

      <OperationsHealth />
      <MarketplaceSyncStatus />
      <ContentApprovalQueue products={products} />
      <MarketingAgent products={products} summary={summary} />

      {/* Tabela de Produtos */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-bold text-gray-900">Gerenciamento de Produtos Cadastrados</h3>
            <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full font-medium">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'itens'}
            </span>
          </div>

          {/* Barra de Ações em Lote */}
          {selectedProductIds.length > 0 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl">
              <span className="text-xs font-bold text-red-700">
                {selectedProductIds.length} {selectedProductIds.length === 1 ? 'selecionado' : 'selecionados'}
              </span>
              <button
                type="button"
                onClick={handleDeleteBulk}
                disabled={isDeletingBulk}
                className="inline-flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-3 py-1 rounded-lg shadow-xs transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isDeletingBulk ? 'Excluindo...' : `Excluir Selecionados (${selectedProductIds.length})`}
              </button>
              <button
                type="button"
                onClick={() => setSelectedProductIds([])}
                className="text-[11px] text-gray-600 hover:text-gray-900 underline ml-1"
              >
                Desmarcar
              </button>
            </div>
          )}
        </div>

        <div className="grid gap-3 border-b border-gray-100 bg-gray-50 px-5 py-3 sm:grid-cols-3">
          <label className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" /><input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Buscar produto ou SKU" className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-xs" /></label>
          <select value={productMarketplace} onChange={(event) => setProductMarketplace(event.target.value)} className="rounded-md border border-gray-300 p-2 text-xs"><option value="">Todos os marketplaces</option>{marketplaces.map((marketplace) => <option key={marketplace.id} value={marketplace.slug}>{marketplace.name}</option>)}</select>
          <select value={productStatus} onChange={(event) => setProductStatus(event.target.value)} className="rounded-md border border-gray-300 p-2 text-xs"><option value="">Todos os status</option><option value="ACTIVE">Ativos</option><option value="INACTIVE">Inativos</option><option value="OUT_OF_STOCK">Sem estoque</option><option value="PENDING_REVIEW">Em revisão</option></select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200 uppercase">
              <tr>
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={products.length > 0 && selectedProductIds.length === products.length}
                    onChange={toggleSelectAll}
                    title="Selecionar todos os produtos"
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="p-4">Produto</th>
                <th className="p-4">Loja Parceira</th>
                <th className="p-4">Preço (R$)</th>
                <th className="p-4">Comissão (%)</th>
                <th className="p-4">Score</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleProducts.map((p) => {
                const isSelected = selectedProductIds.includes(p.id);
                const imageSrc = p.imageUrl ? `/api/images?src=${encodeURIComponent(p.imageUrl)}` : '';
                return (
                  <tr
                    key={p.id}
                    className={`transition-colors ${
                      isSelected ? 'bg-blue-50/70 hover:bg-blue-50' : 'hover:bg-gray-50/80'
                    }`}
                  >
                    <td className="p-4 w-10">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectProduct(p.id)}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                    <td className="p-4 flex items-center gap-3">
                      <img
                        src={imageSrc}
                        alt={p.name}
                        className="w-10 h-10 object-contain rounded bg-gray-50 p-1 border border-gray-200"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.opacity = '0.3';
                        }}
                      />
                      <div>
                        <div className="font-bold text-gray-900 line-clamp-1">{p.name}</div>
                        <div className="text-[10px] text-gray-400">SKU: {p.externalProductId}</div>
                      </div>
                    </td>
                    <td className="p-4 font-semibold text-gray-800">{p.marketplace?.name}</td>
                    <td className="p-4 font-bold text-gray-900">R$ {p.price?.toFixed(2)}</td>
                    <td className="p-4 font-semibold text-emerald-600">
                      {p.commissionPercentage}% (R$ {p.commissionValue?.toFixed(2)})
                    </td>
                    <td className="p-4 font-bold text-indigo-600">{p.computedScore}</td>
                    <td className="p-4">
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {p.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/go/${p.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold text-[11px] bg-blue-50 px-2 py-1 rounded-lg border border-blue-200"
                        >
                          Link <ExternalLink className="w-3 h-3" />
                        </a>
                        <button
                          onClick={() => handleDeleteProduct(p.id, p.name)}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir produto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!visibleProducts.length && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500">
                    Nenhum produto cadastrado no momento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {productPageCount > 1 && <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 text-xs"><span>Página {productPage} de {productPageCount}</span><div className="flex gap-2"><button type="button" disabled={productPage === 1} onClick={() => setProductPage((page) => page - 1)} className="rounded border px-3 py-1.5 disabled:opacity-40">Anterior</button><button type="button" disabled={productPage === productPageCount} onClick={() => setProductPage((page) => page + 1)} className="rounded border px-3 py-1.5 disabled:opacity-40">Próxima</button></div></div>}
      </section>

      {/* Modal de Cadastro Manual de Produto */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 relative shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900">Cadastrar Novo Produto Sem Estoque</h3>
            
            <form onSubmit={handleCreateProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="md:col-span-2">
                <label className="block font-semibold text-gray-700 mb-1">Nome do Produto</label>
                <input
                  type="text"
                  required
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-gray-700 mb-1">ID Externo do Produto</label>
                <input
                  value={newProduct.externalProductId}
                  onChange={(e) => setNewProduct({ ...newProduct, externalProductId: e.target.value })}
                  placeholder="Para Hotmart, use o ucode do produto"
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-gray-700 mb-1">Descrição Detalhada</label>
                <textarea
                  rows={3}
                  required
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Categoria</label>
                <select
                  value={newProduct.categoryId}
                  onChange={(e) => setNewProduct({ ...newProduct, categoryId: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Tipo de Produto</label>
                <select value={newProduct.productType} onChange={(e) => setNewProduct({ ...newProduct, productType: e.target.value })} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2">
                  <option value="">Não informado</option>
                  <option value="PHYSICAL">Produto físico</option>
                  <option value="DIGITAL">Produto digital</option>
                  <option value="AFFILIATE">Afiliado</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Plataforma Parceira</label>
                <select
                  value={newProduct.marketplaceId}
                  onChange={(e) => setNewProduct({ ...newProduct, marketplaceId: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2"
                >
                  {marketplaces.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Preço Atual (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Custo (R$)</label>
                <input type="number" step="0.01" value={newProduct.cost} onChange={(e) => setNewProduct({ ...newProduct, cost: e.target.value })} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2" />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Taxas da Plataforma (R$)</label>
                <input type="number" step="0.01" value={newProduct.platformFees} onChange={(e) => setNewProduct({ ...newProduct, platformFees: e.target.value })} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2" />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Custo de Frete (R$)</label>
                <input type="number" step="0.01" value={newProduct.shippingCost} onChange={(e) => setNewProduct({ ...newProduct, shippingCost: e.target.value })} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2" />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Custo de Marketing (R$)</label>
                <input type="number" step="0.01" value={newProduct.marketingCost} onChange={(e) => setNewProduct({ ...newProduct, marketingCost: e.target.value })} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2" />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Outros Custos (R$)</label>
                <input type="number" step="0.01" value={newProduct.otherCosts} onChange={(e) => setNewProduct({ ...newProduct, otherCosts: e.target.value })} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2" />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Comissão Estimada (%)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={newProduct.commissionPercentage}
                  onChange={(e) => setNewProduct({ ...newProduct, commissionPercentage: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-gray-700 mb-1">URL da Imagem Principal</label>
                <input
                  type="url"
                  required
                  value={newProduct.imageUrl}
                  onChange={(e) => setNewProduct({ ...newProduct, imageUrl: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-gray-700 mb-1">Link Oficial de Afiliado</label>
                <input
                  type="url"
                  required
                  value={newProduct.affiliateUrl}
                  onChange={(e) => setNewProduct({ ...newProduct, affiliateUrl: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Fornecedor</label>
                <input value={newProduct.supplierInfo} onChange={(e) => setNewProduct({ ...newProduct, supplierInfo: e.target.value })} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2" />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Prazo de Entrega</label>
                <input value={newProduct.deliveryTime} onChange={(e) => setNewProduct({ ...newProduct, deliveryTime: e.target.value })} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2" />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Público</label>
                <textarea rows={2} value={newProduct.targetAudience} onChange={(e) => setNewProduct({ ...newProduct, targetAudience: e.target.value })} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2" />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Principais Benefícios</label>
                <textarea rows={2} value={newProduct.keyBenefits} onChange={(e) => setNewProduct({ ...newProduct, keyBenefits: e.target.value })} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2" />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Principais Objeções</label>
                <textarea rows={2} value={newProduct.keyObjections} onChange={(e) => setNewProduct({ ...newProduct, keyObjections: e.target.value })} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2" />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Concorrência</label>
                <textarea rows={2} value={newProduct.competitionNotes} onChange={(e) => setNewProduct({ ...newProduct, competitionNotes: e.target.value })} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2" />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-gray-700 mb-1">Política de Devolução</label>
                <textarea rows={2} value={newProduct.returnPolicy} onChange={(e) => setNewProduct({ ...newProduct, returnPolicy: e.target.value })} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2" />
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold text-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg"
                >
                  Salvar Produto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
