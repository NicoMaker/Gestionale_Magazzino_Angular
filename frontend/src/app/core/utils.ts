import { HttpErrorResponse } from '@angular/common/http';

/** "10,5" | "10.5" | 10.5 → 10.5  (0 se non valido) */
export function parseDecimal(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number.parseFloat(String(value).replace(',', '.'));
  return Number.isNaN(n) ? 0 : n;
}

/** Arrotonda a 2 decimali */
export const round2 = (n: number): number => Number.parseFloat(n.toFixed(2));

/** 1234.5 → "1.234,50" */
export function formatNumber(value: unknown): string {
  const n = Number.parseFloat(String(value));
  if (Number.isNaN(n)) return '0,00';
  const [int, dec] = n.toFixed(2).split('.');
  return `${int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${dec}`;
}

/** 1234.5 → "€ 1.234,50" */
export const formatCurrency = (value: unknown): string => `€ ${formatNumber(value)}`;

/** Intero se possibile, altrimenti 2 decimali con virgola */
export function formatQuantity(value: unknown): string {
  const n = Number.parseFloat(String(value));
  if (Number.isNaN(n)) return '0';
  return Number.isInteger(n) ? n.toString() : n.toFixed(2).replace('.', ',');
}

/** "2026-01-31" | ISO → "31/01/2026" */
export function formatDateIT(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('it-IT');
}

/** Oggi in formato YYYY-MM-DD (data locale, non UTC) */
export function todayISO(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Estrae il messaggio d'errore dalle risposte del backend ({ error }) */
export function apiErrorMessage(
  err: unknown,
  fallback = 'Errore di connessione al server',
): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as { error?: string; message?: string } | string | null;
    if (body && typeof body === 'object') return body.error || body.message || fallback;
    if (err.status === 0) return fallback;
    return `${fallback} (HTTP ${err.status})`;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export function escapeHtml(text: unknown): string {
  if (text === null || text === undefined) return '';
  return String(text).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c] as string,
  );
}

/** Confronto testuale case-insensitive su più campi */
export function matchesAny(term: string, ...fields: (string | null | undefined)[]): boolean {
  const t = term.trim().toLowerCase();
  if (!t) return true;
  return fields.some((f) => !!f && f.toLowerCase().includes(t));
}
