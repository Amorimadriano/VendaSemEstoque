'use client';
import Link from 'next/link';
import { useState } from 'react';

export default function PartnerCheckoutForm({ productId, enabled, sandbox }: { productId: string; enabled: boolean; sandbox: boolean }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [orderId, setOrderId] = useState('');
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    const id = orderId || crypto.randomUUID(); setOrderId(id);
    try {
      const response = await fetch('/api/checkout/parceiros', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, product_id: productId, buyer: { name: form.get('name'), email: form.get('email'), phone: form.get('phone'),
          address: form.get('address'), postal_code: String(form.get('postal_code')).replace(/\D/g, ''), city: form.get('city'), state: String(form.get('state')).toUpperCase() },
        accepted_terms: form.has('accepted_terms') }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível iniciar o pagamento.');
      window.location.assign(data.checkout_url);
    } catch (error) { setError(error instanceof Error ? error.message : 'Falha ao iniciar pagamento.'); setBusy(false); }
  }
  const input = 'mt-1 w-full rounded-lg border p-2.5 bg-white';
  if (!enabled) return <p className="rounded-xl bg-amber-50 p-4 text-amber-900">As compras de parceiros ainda não estão habilitadas. Nenhuma cobrança será realizada.</p>;
  return <div className="rounded-xl border bg-white p-5 space-y-4">
    {sandbox && <p className="text-amber-900 bg-amber-50 p-3 rounded-lg">Ambiente de testes. Não use dados reais de pagamento.</p>}
    {!open ? <button className="w-full bg-blue-700 text-white rounded-lg p-3 font-bold" onClick={() => setOpen(true)}>{sandbox ? 'Testar compra com Mercado Pago' : 'Comprar com Mercado Pago'}</button> : <form onSubmit={submit} className="space-y-3">
      <h2 className="font-bold">Dados para entrega de 1 unidade</h2>
      <p className="text-sm text-gray-600">Os dados serão compartilhados com o vendedor após a confirmação do pagamento para atendimento e entrega. O frete já está incluído.</p>
      {error && <p role="alert" className="text-red-800 bg-red-50 p-3 rounded-lg">{error}</p>}
      <label className="block">Nome completo<input name="name" required minLength={3} maxLength={120} autoComplete="name" className={input} /></label>
      <label className="block">E-mail<input name="email" type="email" required maxLength={254} autoComplete="email" className={input} /></label>
      <label className="block">Telefone<input name="phone" type="tel" required minLength={10} maxLength={25} autoComplete="tel" className={input} /></label>
      <label className="block">CEP<input name="postal_code" pattern="[0-9]{5}-?[0-9]{3}" required autoComplete="postal-code" className={input} /></label>
      <label className="block">Rua, número, complemento e bairro<input name="address" required minLength={10} maxLength={300} autoComplete="street-address" className={input} /></label>
      <div className="grid grid-cols-3 gap-3"><label className="col-span-2">Cidade<input name="city" required minLength={2} maxLength={100} autoComplete="address-level2" className={input} /></label><label>UF<input name="state" required pattern="[A-Za-z]{2}" maxLength={2} autoComplete="address-level1" className={input} /></label></div>
      <label className="flex gap-2 text-sm"><input name="accepted_terms" type="checkbox" required className="mt-1" /><span>Li os dados do vendedor, as condições de entrega, os <Link href="/parceiros/termos" target="_blank" className="text-blue-700 underline">termos</Link> e a <Link href="/privacidade" target="_blank" className="text-blue-700 underline">política de privacidade</Link>.</span></label>
      <p className="text-xs text-gray-600">Você será redirecionado ao checkout do Mercado Pago. Disponibilidade dos meios de pagamento depende do provedor. Nesta versão não oferecemos boleto ou Pix.</p>
      <button disabled={busy} className="w-full bg-blue-700 text-white rounded-lg p-3 font-bold disabled:opacity-50">{busy ? 'Preparando pagamento...' : 'Continuar para o pagamento'}</button>
    </form>}
  </div>;
}
