'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PartnerAuthForm({ register = false }: { register?: boolean }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(''); setBusy(true);
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form);
    try {
      const response = await fetch('/api/parceiros/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, action: register ? 'register' : 'login', accepted_terms: form.has('accepted_terms') }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível acessar a conta.');
      router.push('/parceiros/painel');
    } catch (error) { setError(error instanceof Error ? error.message : 'Falha ao acessar a conta.'); }
    finally { setBusy(false); }
  }
  const input = 'mt-1 w-full rounded-lg border p-3 text-gray-900';
  return <div className="max-w-xl mx-auto rounded-2xl border bg-white p-6 md:p-8">
    <h1 className="text-3xl font-bold mb-3">{register ? 'Cadastre sua loja' : 'Entre no painel do parceiro'}</h1>
    <p className="text-gray-600 mb-6">{register ? 'Cadastro gratuito. Sua conta e seus anúncios serão analisados antes da publicação.' : 'Acompanhe produtos, pagamentos e entregas.'}</p>
    {error && <p role="alert" className="bg-red-50 text-red-800 rounded-lg p-3 mb-4">{error}</p>}
    <form onSubmit={submit} className="space-y-4">
      {register && <>
        <label className="block font-medium">Nome da loja<input name="store_name" minLength={3} maxLength={100} required className={input} autoComplete="organization" /></label>
        <label className="block font-medium">Nome completo ou razão social<input name="legal_name" minLength={5} maxLength={150} required className={input} /></label>
        <label className="block font-medium">CPF ou CNPJ (somente números)<input name="document" pattern="[0-9]{11}|[0-9]{14}" maxLength={14} required className={input} inputMode="numeric" /><span className="text-xs text-gray-500">Apenas para análise administrativa; não será exibido na vitrine.</span></label>
        <label className="block font-medium">Telefone comercial (público)<input name="phone" type="tel" minLength={10} maxLength={25} required className={input} autoComplete="tel" /></label>
        <label className="block font-medium">Endereço comercial completo (público)<input name="business_address" minLength={15} maxLength={300} required className={input} autoComplete="street-address" /></label>
      </>}
      <label className="block font-medium">{register ? 'E-mail comercial (público e usado no login)' : 'E-mail'}<input name="email" type="email" maxLength={254} required className={input} autoComplete="email" /></label>
      <label className="block font-medium">Senha (12 a 72 caracteres)<input name="password" type="password" minLength={12} maxLength={72} required className={input} autoComplete={register ? 'new-password' : 'current-password'} /></label>
      {register && <label className="flex gap-3 text-sm"><input type="checkbox" name="accepted_terms" required className="mt-1" /><span>Li os <Link href="/parceiros/termos" target="_blank" className="text-blue-700 underline">termos do programa</Link> e a <Link href="/privacidade" target="_blank" className="text-blue-700 underline">política de privacidade</Link>. Autorizo a exibição dos dados identificados como públicos e sou responsável pelos produtos, entregas e atendimento.</span></label>}
      <button disabled={busy} className="w-full rounded-lg bg-blue-700 text-white p-3 font-semibold disabled:opacity-50">{busy ? 'Aguarde...' : register ? 'Solicitar cadastro' : 'Entrar'}</button>
    </form>
    <p className="text-sm mt-5"><Link href={register ? '/parceiros/entrar' : '/parceiros/cadastro'} className="text-blue-700 underline">{register ? 'Já tenho uma conta' : 'Quero cadastrar minha loja'}</Link></p>
  </div>;
}
