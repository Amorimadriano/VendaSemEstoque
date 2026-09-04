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
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [marketplaces, setMarketplaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state para novo produto
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    categoryId: '',
    marketplaceId: '',
    brand: '',
    imageUrl: '',
    price: '',
    oldPrice: '',
    commissionPercentage: '',
    externalProductId: '',
    originalUrl: '',
    affiliateUrl: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resMetrics, resProducts, resCats, resMarkets] = await Promise.all([
        fetch('/api/admin/metrics'),
        fetch('/api/products?limit=50'),
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

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newProduct,
          price: parseFloat(newProduct.price),
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
          oldPrice: '',
          commissionPercentage: '',
          externalProductId: '',
          originalUrl: '',
          affiliateUrl: '',
        });
        fetchData();
      }
    } catch (error) {
      console.error(error);
    }
  };

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

      {/* Tabela de Produtos */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">Gerenciamento de Produtos Cadastrados</h3>
          <span className="text-xs text-gray-500">{products.length} itens listados</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200 uppercase">
              <tr>
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
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="p-4 flex items-center gap-3">
                    <img src={p.imageUrl} alt={p.name} className="w-10 h-10 object-contain rounded bg-gray-50 p-1 border border-gray-200" />
                    <div>
                      <div className="font-bold text-gray-900 line-clamp-1">{p.name}</div>
                      <div className="text-[10px] text-gray-400">SKU: {p.externalProductId}</div>
                    </div>
                  </td>
                  <td className="p-4 font-semibold text-gray-800">{p.marketplace.name}</td>
                  <td className="p-4 font-bold text-gray-900">R$ {p.price.toFixed(2)}</td>
                  <td className="p-4 font-semibold text-emerald-600">{p.commissionPercentage}% (R$ {p.commissionValue.toFixed(2)})</td>
                  <td className="p-4 font-bold text-indigo-600">{p.computedScore}</td>
                  <td className="p-4">
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {p.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <a
                      href={`/go/${p.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold"
                    >
                      Testar Link <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
