export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${(seconds % 60).toFixed(0)}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export function formatNumber(num: number, decimals: number = 0): string {
  return num.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatTimestamp(date: string | Date): string {
  return new Date(date).toLocaleString();
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}

export function truncateText(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export function getSeverityColor(severity: string): 'error' | 'warning' | 'info' | 'success' | 'default' {
  switch (severity.toUpperCase()) {
    case 'CRITICAL':
    case 'ERROR':
      return 'error';
    case 'WARNING':
      return 'warning';
    case 'INFO':
      return 'info';
    case 'SUCCESS':
      return 'success';
    default:
      return 'default';
  }
}

export function getStatusColor(status: string): 'error' | 'warning' | 'info' | 'success' | 'default' {
  switch (status.toUpperCase()) {
    case 'ACTIVE':
    case 'ONLINE':
    case 'OPEN':
    case 'RUNNING':
      return 'success';
    case 'INACTIVE':
    case 'OFFLINE':
    case 'CLOSED':
    case 'STOPPED':
      return 'default';
    case 'WARNING':
    case 'DEGRADED':
      return 'warning';
    case 'CRITICAL':
    case 'ERROR':
    case 'FAILED':
      return 'error';
    default:
      return 'default';
  }
}