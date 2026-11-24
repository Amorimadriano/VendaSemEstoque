'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { formatBRL, partnerProductImages } from '@/lib/partner';
import type { Partner, PartnerOrder, PartnerProduct, partnerPaymentConfig } from '@/lib/partner';

type AdminData = { partners: Partner[]; products: PartnerProduct[]; orders: PartnerOrder[]; payments: ReturnType<typeof partnerPaymentConfig>;
  paymentEnvironment?: { cloudflareContext: boolean; variables: { name: string; present: boolean; bindingPresent: boolean | null }[] } };
export default function PartnerAdmin() {
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const response = await fetch('/api/admin/parceiros', { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Falha ao carregar parceiros.');
    setData(result);
  }, []);
  useEffect(() => { load().catch((error: Error) => setError(error.message)); }, [load]);
  async function moderate(target: string, id: string, status?: string) {
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/admin/parceiros', { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, id, status, review_note: reason }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível atualizar.');
      await load(); setMessage('Atualização registrada.');
    } catch (error) { setError(error instanceof Error ? error.message : 'Falha ao atualizar.'); }
    finally { setBusy(false); }
  }
  const button = 'rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-40';
  return <div className="space-y-7">
    <header><Link href="/admin" className="text-blue-700 underline">Voltar à administração</Link><h1 className="text-3xl font-bold mt-4">Vendedores parceiros</h1><p className="text-gray-600">Curadoria, análise cadastral e comissões. Exibição limitada aos 200 registros mais recentes de cada lista.</p></header>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
    {message && <p role="status" className="rounded-xl bg-green-50 p-4 text-green-800">{message}</p>}
    {!data ? <p>Carregando...</p> : <>
      <section className="rounded-xl border bg-blue-50 p-5 space-y-2"><h2 className="font-bold">Prontidão para receber pagamentos</h2>
        <p>Percentual: {data.payments.commissionBps ? `${data.payments.commissionBps / 100}%` : 'NÃO CONFIGURADO'} · Credenciais: {data.payments.configured ? 'configuradas' : 'incompletas'} · Checkout: {data.payments.enabled ? 'habilitado' : 'desabilitado'} · Ambiente: {data.payments.mode}</p>
        {data.paymentEnvironment && <details className="rounded-lg border border-blue-200 bg-white p-3 text-sm">
          <summary className="cursor-pointer font-semibold">Diagnóstico das variáveis desta implantação</summary>
          <p className="mt-2 text-gray-600">Somente nomes e presença são exibidos, nunca os valores. Variáveis locais ou de outro projeto/ambiente não configuram este site.</p>
          <ul className="mt-3 space-y-1 break-words">{data.paymentEnvironment.variables.map((variable) => <li key={variable.name}>
            <code className="break-all">{variable.name}</code>: <strong>{variable.present ? 'recebida' : 'não recebida'}</strong>
            {variable.bindingPresent !== null && ` · binding Cloudflare: ${variable.bindingPresent ? 'presente' : 'ausente'}`}
          </li>)}</ul>
          <p className="mt-3">Confira Workers &amp; Pages → venda-sem-estoque (Pages) → Settings → Variables and Secrets → Production. Depois de salvar, faça uma nova implantação.</p>
        </details>}
        <p className="text-sm">Antes de aprovar vendedores, confirme identidade, contato comercial, origem dos produtos e atendimento. Antes de ativar cobranças reais, conclua a configuração do Mercado Pago, teste o fluxo completo e valide as condições jurídicas e fiscais da operação.</p>
        <p>Comissões confirmadas nos pedidos listados: <strong>{formatBRL(data.orders.reduce((sum, order) => sum + order.earned_commission_cents, 0))}</strong>. Não representa saldo disponível para saque.</p>
      </section>
      <label className="block rounded-xl border bg-white p-5 font-semibold">Parecer administrativo (obrigatório para aprovar, suspender ou rejeitar)<textarea className="block border rounded-lg p-3 w-full mt-2 font-normal" minLength={3} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Registre os critérios verificados ou o motivo da decisão." /></label>
      <section><h2 className="text-xl font-bold mb-4">Contas de parceiros</h2>{!data.partners.length && <p>Nenhuma solicitação recebida.</p>}<div className="grid md:grid-cols-2 gap-4">{data.partners.map((partner) => <article key={partner.id} className="rounded-xl border bg-white p-5 space-y-2">
        <h3 className="font-bold">{partner.store_name} · {partner.status}</h3><p>{partner.legal_name} · Documento: {partner.document}</p><p className="break-all">{partner.email} · {partner.phone}</p><p>{partner.business_address}</p>
        <p>Comissão aceita: {partner.accepted_commission_bps ? `${partner.accepted_commission_bps / 100}%` : 'Ainda não'}</p>
        {partner.review_note && <p className="text-sm text-gray-600">Parecer atual: {partner.review_note}</p>}
        <div className="flex gap-2"><button disabled={busy || reason.trim().length < 3} className={`${button} text-green-800`} onClick={() => moderate('partner', partner.id, 'ACTIVE')}>Aprovar conta</button><button disabled={busy || reason.trim().length < 3} className={`${button} text-red-800`} onClick={() => moderate('partner', partner.id, 'SUSPENDED')}>Suspender</button></div>
      </article>)}</div></section>
      <section><h2 className="text-xl font-bold mb-4">Anúncios para curadoria</h2>{!data.products.length && <p>Nenhum produto enviado.</p>}<div className="grid md:grid-cols-2 gap-4">{data.products.map((product) => <article key={product.id} className="rounded-xl border bg-white p-5 space-y-3">
        <h3 className="font-bold">{product.name} · {product.status}</h3><p className="text-sm">{data.partners.find((partner) => partner.id === product.partner_id)?.store_name || product.partner_id}</p>
        <div className="flex flex-wrap gap-3 text-sm">{partnerProductImages(product).map((image, index) => <a key={image} href={image} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">Analisar foto {index + 1}{index === 0 ? ' (capa)' : ''}</a>)}</div>
        <p className="whitespace-pre-line text-sm">{product.description}</p><p>{formatBRL(product.price_cents)} · {product.stock} unidades disponíveis · Entrega: {product.delivery_days} dias</p>
        <p className="text-sm whitespace-pre-line">Devoluções: {product.return_policy}</p>
        <div className="flex flex-wrap gap-2"><button disabled={busy || reason.trim().length < 3} className={`${button} text-green-800`} onClick={() => moderate('product', product.id, 'ACTIVE')}>Aprovar anúncio</button><button disabled={busy || reason.trim().length < 3} className={`${button} text-red-800`} onClick={() => moderate('product', product.id, 'REJECTED')}>Rejeitar</button><button disabled={busy || reason.trim().length < 3} className={button} onClick={() => moderate('product', product.id, 'INACTIVE')}>Pausar</button></div>
        {product.status === 'ACTIVE' && <Link href={`/loja-parceiros/${product.id}`} className="inline-block text-blue-700 underline">Ver e compartilhar produto aprovado</Link>}
      </article>)}</div></section>
      <section><h2 className="text-xl font-bold mb-4">Pedidos e comissões</h2>{!data.orders.length && <p>Nenhum pedido.</p>}<div className="space-y-3">{data.orders.map((order) => <article key={order.id} className="rounded-xl border bg-white p-5 space-y-2">
        <p className="font-bold">{order.product_name} · {order.status}</p><p className="text-xs break-all">{order.id}</p><p>Pedido: {formatBRL(order.total_cents)} · Pagamentos: {formatBRL(order.paid_cents)} · Estornos: {formatBRL(order.refunded_cents)} · Comissão: {formatBRL(order.earned_commission_cents)}</p>
        {['REVIEW','DISPUTED'].includes(order.status) && <p className="text-red-800">Revise este pedido no Mercado Pago. Pagamento duplicado, disputa ou falta de estoque não deve resultar em envio automático.</p>}
        <button disabled={busy || !data.payments.configured} className={button} onClick={() => moderate('reconcile', order.id)}>Consultar pagamento no provedor</button>
      </article>)}</div></section>
    </>}
  </div>;
}
