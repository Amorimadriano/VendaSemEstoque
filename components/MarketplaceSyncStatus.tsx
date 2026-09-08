'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, XCircle } from 'lucide-react';

type SyncLog = {
  id: string;
  marketplace_slug: string;
  searched_terms: number;
  found: number;
  filtered_out: number;
  published: number;
  status: 'SUCCESS' | 'NO_PRODUCTS' | 'FAILED' | 'MISSING_CREDENTIALS';
  error_message: string | null;
  created_at: string;
};

const STATUS_STYLES: Record<SyncLog['status'], string> = {
  SUCCESS: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  NO_PRODUCTS: 'bg-amber-50 text-amber-700 border-amber-200',
  FAILED: 'bg-red-50 text-red-700 border-red-200',
  MISSING_CREDENTIALS: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_ICON: Record<SyncLog['status'], typeof CheckCircle2> = {
  SUCCESS: CheckCircle2,
  NO_PRODUCTS: AlertTriangle,
  FAILED: XCircle,
  MISSING_CREDENTIALS: XCircle,
};

export default function MarketplaceSyncStatus() {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState('');

  const fetchLogs = () => fetch('/api/admin/marketplace-sync').then((response) => response.ok ? response.json() : []).then(setLogs).catch(() => setLogs([]));

  useEffect(() => { fetchLogs(); }, []);

  async function syncNow() {
    setIsSyncing(true);
    setError('');
    try {
      const response = await fetch('/api/admin/marketplace-sync', { method: 'POST' });
      const result = await response.json();
      if (!response.ok) setError(result.error || 'Falha ao sincronizar marketplaces.');
      await fetchLogs();
    } finally {
      setIsSyncing(false);
    }
  }

  const latestByMarketplace = new Map<string, SyncLog>();
  for (const log of logs) if (!latestByMarketplace.has(log.marketplace_slug)) latestByMarketplace.set(log.marketplace_slug, log);

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-base font-bold text-gray-900">Sincronização de marketplaces</h2>
          <p className="mt-1 text-xs text-gray-500">Diagnóstico por marketplace: termos pesquisados, produtos encontrados, filtrados e publicados.</p>
        </div>
        <button type="button" onClick={syncNow} disabled={isSyncing} className="flex w-fit items-center gap-2 rounded-md border border-blue-600 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-60">
          <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />{isSyncing ? 'Sincronizando...' : 'Sincronizar agora'}
        </button>
      </div>
      {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</p>}
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {[...latestByMarketplace.values()].map((log) => {
          const Icon = STATUS_ICON[log.status];
          return (
            <div key={log.marketplace_slug} className={`rounded-md border p-3 text-xs ${STATUS_STYLES[log.status]}`}>
              <div className="flex items-center justify-between gap-2">
                <strong className="capitalize">{log.marketplace_slug}</strong>
                <span className="flex items-center gap-1 font-bold"><Icon className="h-4 w-4" /> {log.status}</span>
              </div>
              <p className="mt-2 text-gray-700">Termos pesquisados: {log.searched_terms} · Encontrados: {log.found} · Filtrados: {log.filtered_out} · Publicados: {log.published}</p>
              {log.error_message && <p className="mt-2 font-semibold">{log.error_message}</p>}
              <p className="mt-2 text-[11px] text-gray-500">Última execução: {new Date(log.created_at).toLocaleString('pt-BR')}</p>
            </div>
          );
        })}
        {!latestByMarketplace.size && <p className="text-sm text-gray-500">Nenhuma sincronização registrada ainda.</p>}
      </div>
    </section>
  );
}
