/**
 * Utilitário para formatação segura de datas e fusos horários.
 * Converte timestamps ISO (mesmo os retornados do banco sem o sufixo 'Z')
 * para o horário correto de Brasília (America/Sao_Paulo).
 */
export function formatDateTime(dateInput?: string | Date | null): string {
  if (!dateInput) return '';
  const dateStr = typeof dateInput === 'string' ? dateInput.trim() : dateInput.toISOString();
  if (!dateStr) return '';

  const hasTimezone = dateStr.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(dateStr);
  const normalizedStr = hasTimezone ? dateStr : `${dateStr}Z`;

  const d = new Date(normalizedStr);
  if (Number.isNaN(d.getTime())) return dateStr;

  return d.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatDate(dateInput?: string | Date | null): string {
  if (!dateInput) return '';
  const dateStr = typeof dateInput === 'string' ? dateInput.trim() : dateInput.toISOString();
  if (!dateStr) return '';

  const hasTimezone = dateStr.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(dateStr);
  const normalizedStr = hasTimezone ? dateStr : `${dateStr}Z`;

  const d = new Date(normalizedStr);
  if (Number.isNaN(d.getTime())) return dateStr;

  return d.toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
