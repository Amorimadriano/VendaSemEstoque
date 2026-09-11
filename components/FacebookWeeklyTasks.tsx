'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, MessageCircle, PlaySquare, Plus, PencilLine } from 'lucide-react';

type Task = { completed: number; target: number; mode: 'automatic' | 'manual' };
type Tasks = { posts: Task; reels: Task; stories: Task; comments: Task };

const TASK_INFO = [
  { key: 'posts', label: 'Criar 3 novos posts públicos', icon: PencilLine },
  { key: 'reels', label: 'Criar 3 novos reels públicos', icon: PlaySquare },
  { key: 'stories', label: 'Criar 7 novos stories', icon: Plus },
  { key: 'comments', label: 'Responder a 1 comentário', icon: MessageCircle },
] as const;

export default function FacebookWeeklyTasks() {
  const [tasks, setTasks] = useState<Tasks | null>(null);

  useEffect(() => {
    fetch('/api/admin/facebook-weekly-tasks', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => setTasks(result?.tasks || null))
      .catch(() => setTasks(null));
  }, []);

  if (!tasks) return null;

  const completed = Object.values(tasks).reduce((total, task) => total + Math.min(task.completed, task.target), 0);
  const target = Object.values(tasks).reduce((total, task) => total + task.target, 0);
  const progress = Math.round((completed / target) * 100);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-base font-bold text-gray-900">Tarefas semanais do Facebook</h2>
          <p className="mt-1 text-xs text-gray-500">Acompanhamento da semana atual com base nas publicações confirmadas.</p>
        </div>
        <span className="text-xs font-semibold text-gray-500">{completed}/{target} concluídas</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200">
        <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {TASK_INFO.map(({ key, label, icon: Icon }) => {
          const task = tasks[key];
          const done = Math.min(task.completed, task.target);
          const isComplete = done >= task.target;
          return (
            <div key={key} className="rounded-lg border border-gray-200 p-3">
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 h-5 w-5 text-gray-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">{label}</p>
                  <p className={`mt-1 text-xs ${isComplete ? 'text-emerald-700' : 'text-gray-500'}`}>
                    {isComplete ? <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" /> : <Clock3 className="mr-1 inline h-3.5 w-3.5" />}
                    {done}/{task.target} concluída(s){task.mode === 'manual' ? ' · acompanhamento manual' : ''}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}