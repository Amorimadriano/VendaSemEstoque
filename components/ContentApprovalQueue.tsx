'use client';

import { FormEvent, useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, Send } from 'lucide-react';

type Product = { id: string; name: string };
type Content = { id: string; channel: string; content_type: string; hook: string; caption: string; cta: string; status: string; product?: { name: string } };

export default function ContentApprovalQueue({ products }: { products: Product[] }) {
  const [contents, setContents] = useState<Content[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [videoError, setVideoError] = useState('');
  const [selectedContentIds, setSelectedContentIds] = useState<string[]>([]);
  const [selectedFacebookIds, setSelectedFacebookIds] = useState<string[]>([]);
  const [isApprovingBulk, setIsApprovingBulk] = useState(false);
  const [isPublishingBulk, setIsPublishingBulk] = useState(false);
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

  async function approveBulk() {
    const contentIds = selectedContentIds.filter(id => {
      const item = contents.find(c => c.id === id);
      return item?.status === 'DRAFT';
    });

    if (contentIds.length === 0) return;

    setIsApprovingBulk(true);
    try {
      for (const id of contentIds) {
        await fetch('/api/admin/content', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status: 'APPROVED' })
        });
      }

      const response = await fetch('/api/admin/content');
      if (response.ok) {
        const updatedContents = await response.json();
        setContents(updatedContents);
      }

      setSelectedContentIds([]);
    } finally {
      setIsApprovingBulk(false);
    }
  }

  const toggleSelectContent = (contentId: string) => {
    setSelectedContentIds((current) =>
      current.includes(contentId)
        ? current.filter((id) => id !== contentId)
        : [...current, contentId]
    );
  };

  const toggleSelectAll = () => {
    const drafts = contents.filter(c => c.status === 'DRAFT');
    if (selectedContentIds.length === drafts.length && drafts.length > 0) {
      setSelectedContentIds([]);
    } else {
      setSelectedContentIds(drafts.map(c => c.id));
    }
  };

  const draftCount = contents.filter(c => c.status === 'DRAFT').length;
  const approvedFacebookContents = contents.filter(c => c.status === 'APPROVED' && c.channel === 'facebook');

  async function publishFacebookBulk() {
    if (selectedFacebookIds.length === 0) return;
    setPublishError('');
    setIsPublishingBulk(true);
    try {
      const response = await fetch('/api/admin/content/publish-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedFacebookIds }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setPublishError(result.error || 'Não foi possível publicar os conteúdos no Facebook.');
        return;
      }

      const failed = result.failed || 0;
      setPublishError(failed ? `${result.published} publicado(s); ${failed} falhou(aram). ${result.results?.find((item: { error?: string }) => item.error)?.error || ''}` : '');
      const publishedIds = (result.results || []).filter((item: { published: boolean }) => item.published).map((item: { id: string }) => item.id);
      setContents((current) => current.map((item) => publishedIds.includes(item.id) ? { ...item, status: 'PUBLISHED' } : item));
      setSelectedFacebookIds([]);
    } finally {
      setIsPublishingBulk(false);
    }
  }

  async function publishContent(content: Content) {
    setPublishError('');
    if (content.channel === 'instagram' && content.content_type === 'REEL') {
      const videoStatus = await fetch(`/api/admin/content/${content.id}/video/status`, { method: 'POST' });
      if (!videoStatus.ok) {
        const result = await videoStatus.json().catch(() => ({}));
        setPublishError(result.error || 'Gere e aguarde o vídeo do Reel antes de publicar.');
        return;
      }
    }
    const channelName = content.channel === 'instagram' ? 'Instagram' : 'Facebook';
    const response = await fetch(`/api/admin/content/${content.id}/publish`, { method: 'POST' });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      setPublishError(result.error || `Não foi possível publicar no ${channelName}.`);
      return;
    }
    setContents((current) => current.map((item) => item.id === content.id ? { ...item, status: 'PUBLISHED' } : item));
  }

  async function generateVideo(content: Content) {
    setVideoError('');
    const response = await fetch(`/api/admin/content/${content.id}/video`, { method: 'POST' });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      setVideoError(result.error || 'Não foi possível iniciar a renderização do vídeo.');
      return;
    }
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

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-base font-bold text-gray-900">Fila de conteúdo para aprovação</h2>
          <p className="mt-1 text-xs text-gray-500">O agente cria rascunhos diariamente. Revise e aprove antes de publicar.</p>
        </div>
        <button type="button" onClick={generateDrafts} disabled={isGenerating} className="flex w-fit items-center gap-2 rounded-md border border-blue-600 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-60">
          <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
          {isGenerating ? 'Gerando...' : 'Gerar rascunhos agora'}
        </button>
      </div>

      {selectedContentIds.length > 0 && (
        <div className="mt-3 flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-md">
          <span className="text-xs font-bold text-emerald-700">
            {selectedContentIds.length} {selectedContentIds.length === 1 ? 'rascunho selecionado' : 'rascunhos selecionados'}
          </span>
          <button
            type="button"
            onClick={approveBulk}
            disabled={isApprovingBulk}
            className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1 rounded-md shadow-xs transition-colors disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {isApprovingBulk ? 'Aprovando...' : `Aprovar Selecionados (${selectedContentIds.length})`}
          </button>
          <button
            type="button"
            onClick={() => setSelectedContentIds([])}
            className="text-[11px] text-gray-600 hover:text-gray-900 underline ml-1"
          >
            Desmarcar
          </button>
        </div>
      )}

      {draftCount > 0 && (
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={selectedContentIds.length === draftCount && draftCount > 0}
            onChange={toggleSelectAll}
            className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
            title={`Selecionar todos os ${draftCount} rascunho(s)`}
          />
          <span className="font-semibold">Selecionar todos ({draftCount})</span>
        </div>
      )}

      {selectedFacebookIds.length > 0 && (
        <div className="mt-3 flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2">
          <span className="text-xs font-bold text-blue-700">
            {selectedFacebookIds.length} {selectedFacebookIds.length === 1 ? 'publicação selecionada' : 'publicações selecionadas'}
          </span>
          <button
            type="button"
            onClick={publishFacebookBulk}
            disabled={isPublishingBulk}
            className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1 text-xs font-bold text-white shadow-xs transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            {isPublishingBulk ? 'Publicando...' : `Publicar no Facebook (${selectedFacebookIds.length})`}
          </button>
          <button type="button" onClick={() => setSelectedFacebookIds([])} className="ml-1 text-[11px] text-gray-600 underline hover:text-gray-900">
            Desmarcar
          </button>
        </div>
      )}

      {approvedFacebookContents.length > 0 && (
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={selectedFacebookIds.length === approvedFacebookContents.length}
            onChange={() => setSelectedFacebookIds(selectedFacebookIds.length === approvedFacebookContents.length ? [] : approvedFacebookContents.map((content) => content.id))}
            className="h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            title="Selecionar conteúdos aprovados do Facebook"
          />
          <span className="font-semibold">Selecionar publicações aprovadas do Facebook ({approvedFacebookContents.length})</span>
        </div>
      )}

      <form onSubmit={createContent} className="mt-4 grid gap-3 text-xs md:grid-cols-2">
        <select required value={form.productId} onChange={(event) => setForm({ ...form, productId: event.target.value })} className="rounded-md border border-gray-300 p-2">
          {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-3">
          <select value={form.channel} onChange={(event) => setForm({ ...form, channel: event.target.value, contentType: event.target.value === 'facebook' ? 'POST' : 'REEL' })} className="rounded-md border border-gray-300 p-2">
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
          </select>
          <select value={form.contentType} onChange={(event) => setForm({ ...form, contentType: event.target.value })} className="rounded-md border border-gray-300 p-2">
            {form.channel === 'instagram' && <option value="REEL">Reel</option>}
            <option value="STORY">Story</option>
            <option value="POST">Post</option>
            <option value="CAROUSEL">Carrossel</option>
          </select>
        </div>
        <input required value={form.hook} onChange={(event) => setForm({ ...form, hook: event.target.value })} placeholder="Gancho" className="rounded-md border border-gray-300 p-2" />
        <input required value={form.cta} onChange={(event) => setForm({ ...form, cta: event.target.value })} placeholder="CTA" className="rounded-md border border-gray-300 p-2" />
        <textarea required value={form.caption} onChange={(event) => setForm({ ...form, caption: event.target.value })} placeholder="Legenda" className="min-h-20 rounded-md border border-gray-300 p-2 md:col-span-2" />
        <textarea value={form.script} onChange={(event) => setForm({ ...form, script: event.target.value })} placeholder="Roteiro opcional" className="min-h-20 rounded-md border border-gray-300 p-2 md:col-span-2" />
        <button className="flex w-fit items-center gap-2 rounded-md bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-700">
          <Send className="h-4 w-4" /> Salvar rascunho
        </button>
      </form>

      {publishError && <p className="mt-4 rounded-md bg-red-50 p-3 text-xs font-semibold text-red-700">{publishError}</p>}
      {videoError && <p className="mt-4 rounded-md bg-red-50 p-3 text-xs font-semibold text-red-700">{videoError}</p>}

      <div className="mt-5 space-y-3">
        {contents.map((content) => (
          <div key={content.id} className="rounded-md border border-gray-200 p-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong>{content.product?.name}</strong>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 font-bold">{content.channel} · {content.content_type} · {content.status}</span>
            </div>

            {content.status === 'DRAFT' && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedContentIds.includes(content.id)}
                  onChange={() => toggleSelectContent(content.id)}
                  className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-[10px] text-gray-500">Selecionar para aprovação em lote</span>
              </div>
            )}

            <p className="mt-2 font-semibold text-gray-800">{content.hook}</p>
            <p className="mt-1 text-gray-600">{content.caption}</p>
            <p className="mt-1 text-blue-700">CTA: {content.cta}</p>

            {content.status === 'DRAFT' && (
              <button onClick={() => approve(content)} className="mt-3 flex items-center gap-1 text-emerald-700 hover:text-emerald-800">
                <CheckCircle2 className="h-4 w-4" /> Aprovar
              </button>
            )}
            {content.status === 'APPROVED' && (
              <div className="mt-3 flex gap-3">
                {content.channel === 'facebook' && (
                  <input
                    type="checkbox"
                    checked={selectedFacebookIds.includes(content.id)}
                    onChange={() => setSelectedFacebookIds((current) => current.includes(content.id) ? current.filter((id) => id !== content.id) : [...current, content.id])}
                    className="h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    title="Selecionar para publicação em lote no Facebook"
                  />
                )}
                <button onClick={() => generateVideo(content)} className="flex items-center gap-1 text-violet-700 hover:text-violet-800">
                  <Send className="h-4 w-4" /> Gerar vídeo
                </button>
                {!(content.channel === 'facebook' && content.content_type === 'REEL') && (
                  <button onClick={() => publishContent(content)} className="flex items-center gap-1 text-blue-700 hover:text-blue-800">
                    <Send className="h-4 w-4" /> {content.channel === 'instagram' ? 'Publicar no Instagram' : 'Publicar no Facebook'}
                  </button>
                )}
                {content.channel === 'facebook' && content.content_type === 'REEL' && (
                  <span className="text-[11px] text-amber-700">Reel do Facebook exige vídeo processado.</span>
                )}
              </div>
            )}
          </div>
        ))}
        {!contents.length && <p className="text-sm text-gray-500">Nenhum conteúdo preparado.</p>}
      </div>
    </section>
  );
}
