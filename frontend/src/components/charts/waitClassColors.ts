export const WAIT_CLASS_COLORS: Record<string, string> = {
  'CPU Used': '#26A269',
  'ON CPU': '#26A269',
  'User I/O': '#1A5FB4',
  'System I/O': '#5B9BD5',
  'Concurrency': '#8B1A1A',
  'Commit': '#ED7D31',
  'Application': '#A0522D',
  'Configuration': '#FFD966',
  'Cluster': '#7030A0',
  'Network': '#A6A6A6',
  'Scheduler': '#008080',
  'Administrative': '#D2B48C',
  'Other': '#C2185B',
  'Queueing': '#F97316',
  'Idle': '#E5E7EB',
};

export const WAIT_CLASSES: string[] = [
  'ON CPU',
  'User I/O',
  'System I/O',
  'Concurrency',
  'Commit',
  'Application',
  'Configuration',
  'Cluster',
  'Network',
  'Scheduler',
  'Administrative',
  'Other',
  'Queueing',
  'Idle',
  'CPU Used',
];

export const gradientId = (waitClass: string): string =>
  `grad-${waitClass.replace(/[^A-Za-z0-9]+/g, '')}`;