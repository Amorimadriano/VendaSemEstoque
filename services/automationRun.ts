import { getSupabase } from '@/lib/supabase';

export async function runWithAutomationLog<T>(workflow: string, operation: () => Promise<T>): Promise<T> {
  const supabase = getSupabase();
  const id = crypto.randomUUID();
  const startedAt = new Date();
  await supabase.from('automation_runs').insert({
    id,
    workflow,
    status: 'RUNNING',
    started_at: startedAt.toISOString(),
    created_at: startedAt.toISOString(),
  });

  try {
    const result = await operation();
    const finishedAt = new Date();
    await supabase.from('automation_runs').update({
      status: 'SUCCESS',
      summary: JSON.stringify(result),
      finished_at: finishedAt.toISOString(),
      duration_ms: finishedAt.getTime() - startedAt.getTime(),
    }).eq('id', id);
    return result;
  } catch (error) {
    const finishedAt = new Date();
    await supabase.from('automation_runs').update({
      status: 'FAILED',
      error: error instanceof Error ? error.message : String(error),
      finished_at: finishedAt.toISOString(),
      duration_ms: finishedAt.getTime() - startedAt.getTime(),
    }).eq('id', id);
    throw error;
  }
}

export function nextRetryAt(attempt: number, now = Date.now()) {
  const delayMinutes = Math.min(15 * 2 ** Math.max(0, attempt - 1), 24 * 60);
  return new Date(now + delayMinutes * 60_000).toISOString();
}
