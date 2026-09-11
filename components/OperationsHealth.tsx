'use client';

import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';

type Operations = {
  runs: Array<{ id: string; workflow: string; status: string; created_at: string; duration_ms?: number; error?: string }>;
  integrations: Array<{ marketplace_slug: string; status: string; created_at: string }>;
  alerts: Array<{ severity: 'warning' | 'error'; message: string }>;
  funnel: Array<{ channel: string; clicks: number; conversions: number; sales: number; commission: number }>;
};

export default function OperationsHealth() {
  const [data, setData] = useState<Operations | null>(null);
  const load = () => fetch('/api/admin/operations', { cache: 'no-store' }).then((response) => response.ok ? response.json() : null).then(setData);
  useEffect(() => { load(); }, []);
  if (!data) return null;

  return (
    <section className="border-y border-gray-200 bg-white py-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Activity className="h-5 w-5 text-blue-600" /><h2 className="text-base font-bold">Operação e integrações</h2></div>
        <button type="button" onClick={load} title="Atualizar saúde operacional" className="p-2 text-gray-500 hover:text-blue-600"><RefreshCw className="h-4 w-4" /></button>
      </div>

      {data.alerts.length > 0 && <div className="mt-4 space-y-2">{data.alerts.map((alert, index) => <p key={`${alert.message}-${index}`} className={`flex items-start gap-2 border-l-4 px-3 py-2 text-xs ${alert.severity === 'error' ? 'border-red-500 bg-red-50 text-red-800' : 'border-amber-500 bg-amber-50 text-amber-800'}`}><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{alert.message}</p>)}</div>}

      <div className="mt-4 grid gap-5 lg:grid-cols-3">
        <div><h3 className="text-xs font-bold uppercase text-gray-500">Integrações</h3><div className="mt-2 space-y-2">{data.integrations.map((item) => <div key={item.marketplace_slug} className="flex items-center justify-between border-b border-gray-100 py-2 text-xs"><span className="capitalize">{item.marketplace_slug}</span><span className={`flex items-center gap-1 font-bold ${item.status === 'SUCCESS' ? 'text-emerald-700' : 'text-red-700'}`}><CheckCircle2 className="h-3.5 w-3.5" />{item.status}</span></div>)}</div></div>
        <div><h3 className="text-xs font-bold uppercase text-gray-500">Funil dos últimos 7 dias</h3><div className="mt-2 space-y-2">{data.funnel.map((item) => <div key={item.channel} className="border-b border-gray-100 py-2 text-xs"><strong className="capitalize">{item.channel}</strong><p className="mt-1 text-gray-500">{item.clicks} cliques · {item.conversions} vendas · R$ {item.commission.toFixed(2)} comissão</p></div>)}{!data.funnel.length && <p className="text-xs text-gray-500">Sem dados no período.</p>}</div></div>
        <div><h3 className="text-xs font-bold uppercase text-gray-500">Últimas automações</h3><div className="mt-2 space-y-2">{data.runs.slice(0, 6).map((run) => <div key={run.id} className="border-b border-gray-100 py-2 text-xs"><div className="flex justify-between gap-2"><strong>{run.workflow}</strong><span className={run.status === 'SUCCESS' ? 'text-emerald-700' : run.status === 'FAILED' ? 'text-red-700' : 'text-blue-700'}>{run.status}</span></div><p className="mt-1 text-gray-400">{new Date(run.created_at).toLocaleString('pt-BR')}{run.duration_ms ? ` · ${run.duration_ms} ms` : ''}</p></div>)}</div></div>
      </div>
    </section>
  );
}
