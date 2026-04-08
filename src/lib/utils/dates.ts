import { format, parseISO } from 'date-fns';

export function formatDate(date: string | null | undefined): string {
  if (!date) return '';
  try {
    return format(parseISO(date), 'MMM d, yyyy');
  } catch {
    return date;
  }
}

export function formatMonth(targetMonth: string): string {
  // "2026-04" → "April 2026"
  try {
    const [year, month] = targetMonth.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return format(date, 'MMMM yyyy');
  } catch {
    return targetMonth;
  }
}

export function formatRelative(date: string): string {
  const now = new Date();
  const d = parseISO(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return format(d, 'MMM d');
}
