'use client';

import { FormEvent, useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, Send } from 'lucide-react';

type Product = { id: string; name: string };
type Content = { id: string; channel: string; content_type: string; hook: string; caption: string; cta: string; status: string; product?: { name: string } };

export default function ContentApprovalQueue({ products }: { products: Product[] }) {
  const [contents, setContents] = useState<Content[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [form, setForm] = useState({ productId: products[0]?.id || '', channel: 'instagram', contentType: 'REEL', hook: '', caption: '', script: '', cta: 'Confira os detalhes na loja parceira.' });

  useEffect(() => { fetch('/api/admin/content').then((response) => response.ok ? response.json() : []).then(setContents).catch(() => setContents([])); }, []);

  async function createContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch('/api/admin/content', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (!response.ok) return;
    const content = await response.json();
    setContents((current) => [content, ...current]);
    setForm({ ...form, hook: '', caption: '', script: '' });
  }

  async function approve(content: Content) {
    const response = await fetch('/api/admin/content', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: content.id, status: 'APPROVED' }) });
    if (!response.ok) return;
    const updated = await response.json();
    setContents((current) => current.map((item) => item.id === updated.id ? updated : item));
  }

  async function publishToFacebook(content: Content) {
    setPublishError('');
    const response = await fetch(`/api/admin/content/${content.id}/publish`, { method: 'POST' });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      setPublishError(result.error || 'Não foi possível publicar no Facebook.');
      return;
    }
    setContents((current) => current.map((item) => item.id === content.id ? { ...item, status: 'PUBLISHED' } : item));
  }

  async function generateVideo(content: Content) {
    const response = await fetch(`/api/admin/content/${content.id}/video`, { method: 'POST' });
    if (!response.ok) return;
    alert('Vídeo enviado para renderização no Creatomate. Ele ficará disponível para revisão quando terminar.');
  }

  async function generateDrafts() {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/admin/content/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: form.productId, channel: form.channel, contentType: form.contentType }) });
      if (!response.ok) return;
      const content = await response.json();
      setContents((current) => [content, ...current]);
    } finally {
      setIsGenerating(false);
    }
  }

  return <section className="rounded-lg border border-gray-200 bg-white p-5">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="text-base font-bold text-gray-900">Fila de conteúdo para aprovação</h2>
    <p className="mt-1 text-xs text-gray-500">O agente cria rascunhos diariamente. Revise e aprove antes de publicar.</p></div>
    <button type="button" onClick={generateDrafts} disabled={isGenerating} className="flex w-fit items-center gap-2 rounded-md border border-blue-600 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />{isGenerating ? 'Gerando...' : 'Gerar rascunhos agora'}</button></div>
    <form onSubmit={createContent} className="mt-4 grid gap-3 text-xs md:grid-cols-2">
      <select required value={form.productId} onChange={(event) => setForm({ ...form, productId: event.target.value })} className="rounded-md border border-gray-300 p-2">{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select>
      <div className="grid grid-cols-2 gap-3"><select value={form.channel} onChange={(event) => setForm({ ...form, channel: event.target.value })} className="rounded-md border border-gray-300 p-2"><option value="instagram">Instagram</option><option value="facebook">Facebook</option></select><select value={form.contentType} onChange={(event) => setForm({ ...form, contentType: event.target.value })} className="rounded-md border border-gray-300 p-2"><option value="REEL">Reel</option><option value="STORY">Story</option><option value="POST">Post</option><option value="CAROUSEL">Carrossel</option></select></div>
      <input required value={form.hook} onChange={(event) => setForm({ ...form, hook: event.target.value })} placeholder="Gancho" className="rounded-md border border-gray-300 p-2" />
      <input required value={form.cta} onChange={(event) => setForm({ ...form, cta: event.target.value })} placeholder="CTA" className="rounded-md border border-gray-300 p-2" />
      <textarea required value={form.caption} onChange={(event) => setForm({ ...form, caption: event.target.value })} placeholder="Legenda" className="min-h-20 rounded-md border border-gray-300 p-2 md:col-span-2" />
      <textarea value={form.script} onChange={(event) => setForm({ ...form, script: event.target.value })} placeholder="Roteiro opcional" className="min-h-20 rounded-md border border-gray-300 p-2 md:col-span-2" />
      <button className="flex w-fit items-center gap-2 rounded-md bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-700"><Send className="h-4 w-4" /> Salvar rascunho</button>
    </form>
    {publishError && <p className="mt-4 rounded-md bg-red-50 p-3 text-xs font-semibold text-red-700">{publishError}</p>}
    <div className="mt-5 space-y-3">{contents.map((content) => <div key={content.id} className="rounded-md border border-gray-200 p-3 text-xs"><div className="flex flex-wrap items-center justify-between gap-2"><strong>{content.product?.name}</strong><span className="rounded-full bg-gray-100 px-2 py-0.5 font-bold">{content.channel} · {content.content_type} · {content.status}</span></div><p className="mt-2 font-semibold text-gray-800">{content.hook}</p><p className="mt-1 text-gray-600">{content.caption}</p><p className="mt-1 text-blue-700">CTA: {content.cta}</p>{content.status === 'DRAFT' && <button onClick={() => approve(content)} className="mt-3 flex items-center gap-1 text-emerald-700 hover:text-emerald-800"><CheckCircle2 className="h-4 w-4" /> Aprovar</button>}{content.status === 'APPROVED' && content.channel === 'facebook' && <div className="mt-3 flex gap-3"><button onClick={() => generateVideo(content)} className="flex items-center gap-1 text-violet-700 hover:text-violet-800"><Send className="h-4 w-4" /> Gerar vídeo</button><button onClick={() => publishToFacebook(content)} className="flex items-center gap-1 text-blue-700 hover:text-blue-800"><Send className="h-4 w-4" /> Publicar no Facebook</button></div>}</div>)}{!contents.length && <p className="text-sm text-gray-500">Nenhum conteúdo preparado.</p>}</div>
  </section>;
}