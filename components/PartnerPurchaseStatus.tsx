'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { formatBRL, partnerOrderLabels, partnerDeliveryLabels } from '@/lib/partner';
import type { PartnerOrder } from '@/lib/partner';

type Receipt = { id: string; product_name: string; total_cents: number; status: PartnerOrder['status']; fulfillment_status: PartnerOrder['fulfillment_status'];
  tracking_code: string | null; seller: { store_name: string; email: string; phone: string } };
export default function PartnerPurchaseStatus() {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setBusy(true); setError('');
    try {
      const params = new URLSearchParams(window.location.search);
      if (!params.get('pedido') || !params.get('token')) throw new Error('Use o endereço de acompanhamento recebido ao retornar do checkout.');
      const query = new URLSearchParams({ pedido: params.get('pedido') || '', token: params.get('token') || '' });
      const response = await fetch(`/api/checkout/parceiros?${query}`, { cache: 'no-store', referrerPolicy: 'no-referrer' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível consultar a compra.');
      setReceipt(data);
    } catch (error) { setError(error instanceof Error ? error.message : 'Falha ao consultar compra.'); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  return <section className="max-w-2xl mx-auto rounded-2xl border bg-white p-8 space-y-5">
    <h1 className="text-3xl font-bold">Acompanhe sua compra</h1>
    <p>O retorno do checkout não confirma o pagamento. A situação abaixo é atualizada após consulta autenticada ao Mercado Pago.</p>
    {error && <p role="alert" className="text-red-800 bg-red-50 rounded-lg p-4">{error}</p>}
    {receipt && <div className="space-y-3">
      <h2 className="text-xl font-bold">{receipt.product_name}</h2><p>{formatBRL(receipt.total_cents)}</p><p className="text-xs break-all">Pedido: {receipt.id}</p>
      <p>Pagamento: <strong>{partnerOrderLabels[receipt.status]}</strong></p><p>Entrega: {partnerDeliveryLabels[receipt.fulfillment_status]}</p>
      {receipt.tracking_code && <p>Rastreamento: {receipt.tracking_code}</p>}
      <p>Vendedor: {receipt.seller.store_name}<br />{receipt.seller.email}<br />{receipt.seller.phone}</p>
      <p className="text-sm text-gray-600">Salve esta página. O link contém uma chave privada de acompanhamento: não o compartilhe publicamente. Para entrega, cancelamento ou devolução, contate o vendedor ou use os canais do Mercado Pago.</p>
    </div>}
    <button onClick={load} disabled={busy} className="rounded-lg bg-blue-700 px-5 py-3 text-white font-semibold disabled:opacity-50">{busy ? 'Consultando...' : 'Atualizar situação'}</button>
    <p><Link href="/loja-parceiros" className="text-blue-700 underline">Voltar à vitrine</Link></p>
  </section>;
}
