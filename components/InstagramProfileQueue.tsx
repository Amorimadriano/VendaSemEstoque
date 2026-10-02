'use client';

import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { ExternalLink, Instagram, Plus, RefreshCw, Trash2 } from 'lucide-react';
import type { InstagramProfileStatus } from '@/lib/instagramProfileCandidate';

type Candidate = {
  id: string;
  username: string;
  profile_url: string;
  notes: string | null;
  status: InstagramProfileStatus;
  created_at: string;
};

const STATUS_LABELS: Record<InstagramProfileStatus, string> = {
  PENDING_REVIEW: 'Pendente',
  FOLLOWED_MANUALLY: 'Seguido manualmente',
  SKIPPED: 'Ignorado',
};

export default function InstagramProfileQueue() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [profile, setProfile] = useState('');
  const [notes, setNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | InstagramProfileStatus>('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [reviewIds, setReviewIds] = useState<string[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadCandidates() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/instagram-profile-candidates');
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Falha ao carregar perfis.');
      setCandidates(result.candidates || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Falha ao carregar perfis.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCandidates();
  }, []);

  async function addCandidate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile.trim()) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/admin/instagram-profile-candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, notes }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Falha ao salvar perfil.');
      setCandidates((current) => [result.candidate, ...current]);
      setProfile('');
      setNotes('');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Falha ao salvar perfil.');
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(candidate: Candidate, status: InstagramProfileStatus) {
    setError('');
    try {
      const response = await fetch('/api/admin/instagram-profile-candidates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: candidate.id, status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Falha ao atualizar perfil.');
      setCandidates((current) => current.map((item) => item.id === candidate.id ? result.candidate : item));
      return true;
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Falha ao atualizar perfil.');
      return false;
    }
  }

  async function removeCandidate(candidate: Candidate) {
    setError('');
    try {
      const response = await fetch('/api/admin/instagram-profile-candidates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: candidate.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Falha ao remover perfil.');
      setCandidates((current) => current.filter((item) => item.id !== candidate.id));
      setSelectedIds((current) => current.filter((id) => id !== candidate.id));
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Falha ao remover perfil.');
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  function toggleVisibleSelection(event: ChangeEvent<HTMLInputElement>, visibleIds: string[]) {
    setSelectedIds((current) => event.target.checked
      ? Array.from(new Set([...current, ...visibleIds]))
      : current.filter((id) => !visibleIds.includes(id)));
  }

  function beginBatchReview() {
    const queue = visibleCandidates.filter((candidate) => selectedIds.includes(candidate.id)).map((candidate) => candidate.id);
    setReviewIds(queue);
    setReviewIndex(0);
  }

  function advanceBatch() {
    if (reviewIndex + 1 >= reviewIds.length) {
      setReviewIds([]);
      setReviewIndex(0);
    } else {
      setReviewIndex((current) => current + 1);
    }
  }

  function openCurrentProfile(candidate: Candidate) {
    window.open(candidate.profile_url, '_blank', 'noopener,noreferrer');
  }

  const visibleCandidates = candidates.filter((candidate) => statusFilter === 'ALL' || candidate.status === statusFilter);
  const visibleIds = visibleCandidates.map((candidate) => candidate.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const currentReview = candidates.find((candidate) => candidate.id === reviewIds[reviewIndex]);

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <Instagram className="h-5 w-5 text-pink-600" />
          <div>
            <h2 className="text-base font-bold text-gray-900">Perfis do Instagram</h2>
            <p className="text-xs text-gray-500">Revisão e follow manual</p>
          </div>
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">{candidates.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="instagram-profile-status-filter">Filtrar perfis</label>
          <select
            id="instagram-profile-status-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'ALL' | InstagramProfileStatus)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
          >
            <option value="ALL">Todos</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button type="button" onClick={() => void loadCandidates()} disabled={loading} title="Atualizar lista" className="rounded-md border border-gray-300 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <form onSubmit={addCandidate} className="grid gap-3 border-b border-gray-100 bg-gray-50/70 p-4 md:grid-cols-[1fr_1fr_auto]">
        <div>
          <label htmlFor="instagram-profile-input" className="mb-1 block text-xs font-semibold text-gray-700">Usuário ou URL</label>
          <input
            id="instagram-profile-input"
            value={profile}
            onChange={(event) => setProfile(event.target.value)}
            placeholder="@perfil ou instagram.com/perfil"
            maxLength={200}
            required
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
          />
        </div>
        <div>
          <label htmlFor="instagram-profile-notes" className="mb-1 block text-xs font-semibold text-gray-700">Notas</label>
          <input
            id="instagram-profile-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Tema, motivo ou contexto"
            maxLength={500}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
          />
        </div>
        <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 self-end rounded-md bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700 disabled:opacity-50">
          <Plus className="h-4 w-4" />
          Adicionar
        </button>
      </form>

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 bg-pink-50 px-5 py-3">
          <span className="text-sm font-semibold text-gray-800">{selectedIds.length} selecionados</span>
          <button type="button" onClick={beginBatchReview} className="rounded-md bg-pink-600 px-3 py-2 text-xs font-semibold text-white hover:bg-pink-700">Revisar lote</button>
          <button type="button" onClick={() => setSelectedIds([])} className="rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">Limpar seleção</button>
        </div>
      )}

      {error && <p role="alert" className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700">{error}</p>}

      {loading ? (
        <div className="px-5 py-8 text-center text-sm text-gray-500">Carregando perfis...</div>
      ) : visibleCandidates.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-gray-500">Nenhum perfil nesta lista.</div>
      ) : (
        <ul className="divide-y divide-gray-100">
          <li className="flex items-center gap-3 bg-gray-50 px-5 py-2 text-xs font-semibold text-gray-600">
            <input type="checkbox" aria-label="Selecionar todos os perfis visíveis" checked={allVisibleSelected} onChange={(event) => toggleVisibleSelection(event, visibleIds)} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
            <span>Selecionar todos</span>
          </li>
          {visibleCandidates.map((candidate) => (
            <li key={candidate.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <input type="checkbox" aria-label={`Selecionar @${candidate.username}`} checked={selectedIds.includes(candidate.id)} onChange={() => toggleSelected(candidate.id)} className="mt-1 h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
                <div className="min-w-0">
                  <a href={candidate.profile_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-gray-900 hover:text-pink-700">
                    @{candidate.username}<ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  {candidate.notes && <p className="mt-1 break-words text-sm text-gray-600">{candidate.notes}</p>}
                  <p className="mt-1 text-xs text-gray-400">{STATUS_LABELS[candidate.status]}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 pl-7 sm:pl-0">
                <select
                  aria-label={`Status de @${candidate.username}`}
                  value={candidate.status}
                  onChange={(event) => void updateStatus(candidate, event.target.value as InstagramProfileStatus)}
                  className="rounded-md border border-gray-300 bg-white px-2.5 py-2 text-xs text-gray-700"
                >
                  {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <button type="button" onClick={() => void removeCandidate(candidate)} title={`Remover @${candidate.username}`} className="rounded-md border border-gray-300 p-2 text-gray-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {reviewIds.length > 0 && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="instagram-batch-title" className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="instagram-batch-title" className="text-base font-bold text-gray-900">Revisão em lote</h3>
                <p className="mt-1 text-xs text-gray-500">Perfil {reviewIndex + 1} de {reviewIds.length}</p>
              </div>
              <button type="button" onClick={() => setReviewIds([])} className="text-sm font-medium text-gray-500 hover:text-gray-900">Encerrar</button>
            </div>
            {currentReview ? (
              <div className="mt-5">
                <p className="text-lg font-semibold text-gray-900">@{currentReview.username}</p>
                {currentReview.notes && <p className="mt-1 text-sm text-gray-600">{currentReview.notes}</p>}
                <button type="button" onClick={() => openCurrentProfile(currentReview)} className="mt-4 inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                  Abrir perfil no Instagram <ExternalLink className="h-4 w-4" />
                </button>
                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  <button type="button" onClick={advanceBatch} className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Próximo</button>
                  <button type="button" onClick={async () => { if (await updateStatus(currentReview, 'FOLLOWED_MANUALLY')) advanceBatch(); }} className="rounded-md bg-pink-600 px-3 py-2 text-sm font-semibold text-white hover:bg-pink-700">Marcar seguido e avançar</button>
                </div>
              </div>
            ) : (
              <p className="mt-5 text-sm text-gray-600">A seleção não contém perfis para revisar.</p>
            )}
          </section>
        </div>
      )}
    </section>
  );
}