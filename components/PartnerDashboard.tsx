'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatBRL, moneyToCents, partnerOrderLabels, partnerDeliveryLabels } from '@/lib/partner';
import type { Partner, PartnerOrder, PartnerProduct, partnerPaymentConfig } from '@/lib/partner';

type SellerOrder = Omit<PartnerOrder, 'buyer'> & { buyer: PartnerOrder['buyer'] | null };
type Dashboard = { partner: Partner; products: PartnerProduct[]; orders: SellerOrder[];
  paymentAccount: { provider_user_id: string; live_mode: boolean } | null; payments: ReturnType<typeof partnerPaymentConfig> };
const input = 'mt-1 w-full rounded-lg border p-2.5 bg-white text-gray-900';
const button = 'rounded-lg bg-blue-700 text-white px-4 py-2 font-semibold disabled:opacity-50';

export default function PartnerDashboard() {
  const router = useRouter();
  const [data, setData] = useState<Dashboard | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<PartnerProduct | null>(null);
  const [formKey, setFormKey] = useState(0);
  const load = useCallback(async () => {
    const response = await fetch('/api/parceiros/painel', { cache: 'no-store' });
    const body = await response.json();
    if (response.status === 401) { router.replace('/parceiros/entrar'); return; }
    if (!response.ok) throw new Error(body.error || 'Falha ao carregar o painel.');
    setData(body);
  }, [router]);
  useEffect(() => { load().catch((error: Error) => setError(error.message)); }, [load]);
  async function perform(payload: object, success: string) {
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/parceiros/painel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Não foi possível salvar.');
      await load(); setMessage(success); return true;
    } catch (error) { setError(error instanceof Error ? error.message : 'Falha ao salvar.'); return false; }
    finally { setBusy(false); }
  }
  async function submitProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const ok = await perform({ action: 'product', ...(editing ? { id: editing.id, expected_updated_at: editing.updated_at } : {}),
        name: form.get('name'), description: form.get('description'), image_url: form.get('image_url'),
        price_cents: moneyToCents(String(form.get('price')).replace(',', '.')), stock: Number(form.get('stock')),
        delivery_days: Number(form.get('delivery_days')), return_policy: form.get('return_policy'),
      }, 'Produto enviado para análise. A publicação depende de aprovação.');
      if (ok) { setEditing(null); setFormKey((key) => key + 1); }
    } catch (error) { setError(error instanceof Error ? error.message : 'Preço inválido.'); }
  }
  async function logout() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/parceiros/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) });
      if (!response.ok) throw new Error('Não foi possível sair.');
      router.push('/parceiros/entrar');
    } catch (error) { setError(error instanceof Error ? error.message : 'Falha ao sair.'); setBusy(false); }
  }
  return <div className="space-y-7">
    <header className="flex flex-wrap justify-between gap-4"><div><h1 className="text-3xl font-bold">Painel do parceiro</h1><p className="text-gray-600">Produtos, vendas confirmadas e entregas.</p></div><button onClick={logout} disabled={busy} className="text-blue-700 underline">Sair da conta</button></header>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
    {message && <p role="status" className="rounded-xl bg-green-50 p-4 text-green-800">{message}</p>}
    {!data ? <p>Carregando painel...</p> : <>
      <section className="rounded-2xl border bg-white p-6 space-y-3">
        <h2 className="text-xl font-bold">{data.partner.store_name}</h2>
        <p>Situação da conta: <strong>{data.partner.status === 'ACTIVE' ? 'Aprovada' : data.partner.status === 'SUSPENDED' ? 'Suspensa para novas vendas' : 'Aguardando análise'}</strong></p>
        {data.partner.review_note && <p className="text-gray-600">{data.partner.review_note}</p>}
        <p>Comissão da plataforma: {data.payments.commissionBps ? `${data.payments.commissionBps / 100}% do valor do produto (frete incluído)` : 'Ainda não definida; vendas bloqueadas até seu aceite'}. Tarifas do Mercado Pago são adicionais.</p>
        {data.payments.commissionBps && data.partner.accepted_commission_bps !== data.payments.commissionBps && <button className={button} disabled={busy || data.partner.status === 'SUSPENDED'} onClick={() => perform({ action: 'accept_commission', bps: data.payments.commissionBps }, 'Percentual aceito e registrado.')}>Li os termos e aceito a comissão de {data.payments.commissionBps / 100}%</button>}
        {data.payments.commissionBps && data.partner.accepted_commission_bps === data.payments.commissionBps && <p className="text-green-700">Percentual aceito.</p>}
        <p>{data.paymentAccount ? `Mercado Pago conectado (${data.paymentAccount.live_mode ? 'produção' : 'teste'}).` : 'Mercado Pago não conectado.'}</p>
        {data.payments.enabled && data.payments.configured ? <a href="/api/parceiros/mercadopago" className="inline-block text-blue-700 underline">{data.paymentAccount ? 'Reconectar Mercado Pago' : 'Conectar minha conta Mercado Pago'}</a> : <p className="text-amber-800">Pagamentos ainda não habilitados pela plataforma. Você já pode cadastrar produtos para análise.</p>}
        <p className="text-sm"><Link href="/parceiros/termos" className="text-blue-700 underline">Termos e responsabilidades</Link> · <Link href="/loja-parceiros" className="text-blue-700 underline">Ver vitrine</Link></p>
      </section>
      <section className="rounded-2xl border bg-white p-6">
        <h2 className="text-xl font-bold mb-4">{editing ? 'Editar produto (exige nova aprovação)' : 'Enviar produto para análise'}</h2>
        <form key={`${editing?.id || 'new'}-${formKey}`} onSubmit={submitProduct} className="grid md:grid-cols-2 gap-4">
          <label>Nome<input name="name" required minLength={5} maxLength={120} defaultValue={editing?.name} className={input} /></label>
          <label>URL HTTPS da foto autorizada<input name="image_url" type="url" pattern="https://.*" required maxLength={2000} defaultValue={editing?.image_url} className={input} /></label>
          <label className="md:col-span-2">Descrição completa<textarea name="description" required minLength={40} maxLength={5000} defaultValue={editing?.description} className={input} rows={4} /></label>
          <label>Preço com frete incluído (R$)<input name="price" type="number" step="0.01" min="1" max="100000" required defaultValue={editing ? editing.price_cents / 100 : ''} className={input} /></label>
          <label>Unidades disponíveis para novas vendas<input name="stock" type="number" min="0" max="100000" required defaultValue={editing?.stock ?? 1} className={input} /></label>
          <label>Prazo máximo de entrega no Brasil (dias corridos)<input name="delivery_days" type="number" min="1" max="60" required defaultValue={editing?.delivery_days ?? 10} className={input} /></label>
          <label>Política de devolução e atendimento<textarea name="return_policy" required minLength={30} maxLength={2000} defaultValue={editing?.return_policy} className={input} rows={3} placeholder="Descreva como o cliente solicita atendimento, devolução e reembolso, respeitando a legislação aplicável." /></label>
          <p className="md:col-span-2 text-sm text-gray-600">O preço deve cobrir a entrega em todo o Brasil. Não inclua no estoque disponível as unidades já reservadas em pedidos. Fotos devem ter uso autorizado. Não publique produtos ilegais, falsificados ou restritos.</p>
          <div className="flex gap-4"><button className={button} disabled={busy || data.partner.status === 'SUSPENDED'}>{busy ? 'Aguarde...' : 'Enviar para aprovação'}</button>{editing && <button type="button" className="text-blue-700 underline" onClick={() => setEditing(null)}>Cancelar edição</button>}</div>
        </form>
      </section>
      <section><h2 className="text-xl font-bold mb-4">Seus produtos (até 200 mais recentes)</h2>
        {!data.products.length && <p>Nenhum produto cadastrado.</p>}
        <div className="grid md:grid-cols-2 gap-4">{data.products.map((product) => <article key={product.id} className="rounded-xl border bg-white p-5 space-y-2">
          <h3 className="font-bold">{product.name}</h3><p>{formatBRL(product.price_cents)} · {product.stock} disponíveis · {product.status}</p>
          {product.review_note && <p className="text-sm text-gray-600">Análise: {product.review_note}</p>}
          <div className="flex flex-wrap gap-4 text-sm">
            <button disabled={busy} onClick={() => setEditing(product)} className="text-blue-700 underline">Editar</button>
            <button disabled={busy || product.status === 'INACTIVE'} onClick={() => perform({ action: 'pause_product', id: product.id }, 'Produto pausado.')} className="text-red-700 underline">Pausar anúncio</button>
            {product.status === 'ACTIVE' && <Link href={`/loja-parceiros/${product.id}`} className="text-blue-700 underline">Ver e compartilhar</Link>}
          </div>
        </article>)}</div>
      </section>
      <section><h2 className="text-xl font-bold mb-2">Pedidos (até 200 mais recentes)</h2>
        <p className="text-sm text-gray-600 mb-4">Apenas pagamentos confirmados autorizam o envio. Valores e comissões podem ser ajustados por estornos e disputas. Reembolsos devem ser tratados na sua conta Mercado Pago; não há saque ou repasse manual pela plataforma.</p>
        {!data.orders.length && <p>Nenhum pedido recebido.</p>}
        <div className="space-y-4">{data.orders.map((order) => <article key={order.id} className="rounded-xl border bg-white p-5 space-y-2">
          <h3 className="font-bold">{order.product_name}</h3><p className="text-xs break-all">Pedido {order.id}</p>
          <p>{partnerOrderLabels[order.status]} · {formatBRL(order.total_cents)} · Comissão confirmada: {formatBRL(order.earned_commission_cents)}</p>
          {order.status === 'REVIEW' && <p className="text-red-700">Não envie este pedido antes da revisão administrativa.</p>}
          {order.buyer && <div className="text-sm"><p>{order.buyer.name} · {order.buyer.email} · {order.buyer.phone}</p><p>{order.buyer.address}, {order.buyer.city}/{order.buyer.state} · CEP {order.buyer.postal_code}</p></div>}
          <p>Entrega: {partnerDeliveryLabels[order.fulfillment_status]}{order.tracking_code && ` · Rastreio: ${order.tracking_code}`}</p>
          {['PAID','PARTIALLY_REFUNDED'].includes(order.status) && <form className="flex flex-wrap gap-3" onSubmit={(event) => {
            event.preventDefault(); const form = new FormData(event.currentTarget);
            perform({ action: 'fulfillment', id: order.id, status: form.get('status'), tracking_code: form.get('tracking_code') }, 'Entrega atualizada.');
          }}><input aria-label="Código de rastreamento" name="tracking_code" minLength={3} maxLength={100} defaultValue={order.tracking_code || ''} placeholder="Código de rastreamento" required className="rounded-lg border p-2" /><select aria-label="Situação da entrega" name="status" defaultValue={order.fulfillment_status === 'DELIVERED' ? 'DELIVERED' : 'SHIPPED'} className="rounded-lg border p-2"><option value="SHIPPED">Enviado</option><option value="DELIVERED">Entregue</option></select><button disabled={busy} className={button}>Atualizar entrega</button></form>}
        </article>)}</div>
      </section>
    </>}
  </div>;
}
