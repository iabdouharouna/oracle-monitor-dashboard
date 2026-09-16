import { format, parseISO, addHours, subHours, startOfDay, endOfDay, isValid } from 'date-fns';

export function formatDateTime(date: string | Date, pattern: string = 'yyyy-MM-dd HH:mm:ss'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isValid(d) ? format(d, pattern) : 'Invalid date';
}

export function formatTime(date: string | Date): string {
  return formatDateTime(date, 'HH:mm:ss');
}

export function formatDate(date: string | Date): string {
  return formatDateTime(date, 'yyyy-MM-dd');
}

export function formatRelative(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return 'Invalid date';
  
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(d);
}

export function getTimeRangeHours(range: string): number {
  const ranges: Record<string, number> = {
    '5m': 5 / 60,
    '15m': 15 / 60,
    '1h': 1,
    '6h': 6,
    '24h': 24,
    '7d': 168,
    '30d': 720,
  };
  return ranges[range] || 1;
}

export function getTimeRangeStart(range: string): Date {
  return subHours(new Date(), getTimeRangeHours(range));
}

export function getTimeRangeEnd(): Date {
  return new Date();
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${(seconds % 60).toFixed(0)}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export function parseDuration(str: string): number {
  // Parse strings like "1h 30m" or "90m" or "5400s"
  const hoursMatch = str.match(/(\d+)h/);
  const minsMatch = str.match(/(\d+)m/);
  const secsMatch = str.match(/(\d+)s/);
  
  const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
  const mins = minsMatch ? parseInt(minsMatch[1]) : 0;
  const secs = secsMatch ? parseInt(secsMatch[1]) : 0;
  
  return hours * 3600 + mins * 60 + secs;
}