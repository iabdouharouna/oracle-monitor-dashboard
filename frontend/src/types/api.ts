export interface OverviewData {
  database: DatabaseStatus;
  alerts: AlertSummary;
  storage: StorageSummary;
  sessions: SessionSummary;
  io: IOSummary;
  waits: WaitSummary;
  timestamp: string;
}

export interface DatabaseStatus {
  name: string;
  version: string;
  host: string;
  platform: string;
  status: 'OPEN' | 'MOUNTED' | 'READ ONLY';
  role: 'PRIMARY' | 'PHYSICAL STANDBY' | 'LOGICAL STANDBY';
  startupTime: string;
  uptimeSeconds: number;
}

export interface AlertSummary {
  critical: number;
  warning: number;
  info: number;
  lastChecked: string;
}

export interface StorageSummary {
  totalGB: number;
  usedGB: number;
  freeGB: number;
  pctUsed: number;
  tablespaceCount: number;
  criticalTablespaces: number;
}

export interface SessionSummary {
  total: number;
  active: number;
  inactive: number;
  blocked: number;
  pctActive: number;
}

export interface IOSummary {
  readMBps: number;
  writeMBps: number;
  readIOPS: number;
  writeIOPS: number;
  avgReadLatencyMs: number;
  avgWriteLatencyMs: number;
}

export interface WaitClassData {
  waitClass: string;
  waitsPerSec: number;
  timeWaitedMs: number;
  pctDBTime: number;
}

export interface WaitSummary {
  topWaitClasses: WaitClassData[];
  totalWaitsPerSec: number;
  dbTimePerSec: number;
}

export interface TimeSeriesData {
  timestamps: string[];
  series: Record<string, number[]>;
}

export interface InstanceInfo {
  database: DatabaseInfo;
  clients: ClientSummary[];
  processes: ProcessMetrics;
  memory: MemoryMetrics;
  storage: StorageMetrics;
  cpuRatio: CPURatio;
  topSql: TopSQL[];
}

export interface DatabaseInfo {
  name: string;
  version: string;
  host: string;
  platform: string;
  status: string;
  startupTime: string;
  logMode: string;
  role: string;
  instanceNumber: number;
  uptimeSeconds: number;
}

export interface ClientSummary {
  machine: string;
  program: string;
  module: string;
  sessionCount: number;
}

export interface ProcessMetrics {
  processCount: number;
  execRate: number;
  parseRate: number;
  openCursors: number;
  commitRate: number;
  rollbackRate: number;
}

export interface SGAMetrics {
  totalMB: number;
  bufferCacheMB: number;
  sharedPoolMB: number;
  sharedPoolFreeMB?: number;
  largePoolMB: number;
  javaPoolMB: number;
  streamsPoolMB: number;
  redoLogBufferMB: number;
  fixedSGA: number;
}

export interface PGAMetrics {
  aggregateTargetMB: number;
  totalAllocatedMB: number;
  totalUsedMB: number;
  cacheHitPercentage: number;
  maxAllocatedMB: number;
}

export interface MemoryMetrics {
  sga: SGAMetrics;
  pga: PGAMetrics;
  bufferCacheHitRatio: number;
  libraryCacheHitRatio: number;
}

export interface TablespaceInfo {
  name: string;
  type: 'PERMANENT' | 'TEMPORARY' | 'UNDO';
  status: 'ONLINE' | 'OFFLINE' | 'READ ONLY';
  sizeMB: number;
  usedMB: number;
  freeMB: number;
  pctUsed: number;
  autoextensible: boolean;
  maxSizeMB: number | null;
}

export interface RedoLogInfo {
  group: number;
  members: number;
  sizeMB: number;
  status: string;
  switchesPerHour: number;
}

export interface StorageMetrics {
  tablespaces: TablespaceInfo[];
  redoLogs: RedoLogInfo[];
  archiveLogRate: number;
}

export interface CPURatio {
  dbCpuPct: number;
  osCpuPct: number;
  dbTimePerSec: number;
}

export interface TopSQL {
  sqlId: string;
  planHashValue: number;
  executions: number;
  cpuTimeSec: number;
  elapsedTimeSec: number;
  bufferGets: number;
  diskReads: number;
  rowsProcessed: number;
  sqlText: string;
}

export interface AASDataPoint {
  timestamp: string;
  waitClass: string;
  aas: number;
  samples: number;
}

export interface DrilldownData {
  dimension: string;
  filterDimension: string;
  data: DrilldownRow[];
}

export interface DrilldownRow {
  dimensionValue: string;
  filterValue: string;
  samples: number;
  aas: number;
  pctTotal: number;
}

export interface SQLMonitorEntry {
  sqlId: string;
  sqlExecId: number;
  status: 'EXECUTING' | 'DONE (ERROR)' | 'DONE (ALL ROWS)' | 'DONE (FIRST N ROWS)';
  durationSec: number;
  cpuTimeSec: number;
  ioTimeSec: number;
  sqlText: string;
  username: string;
  module: string;
  pxServers: number;
  startTime: string;
  lastRefreshTime: string;
}

export interface ExecutionPlanStep {
  id: number;
  parentId: number | null;
  operation: string;
  options: string | null;
  objectName: string | null;
  cost: number;
  cardinality: number;
  bytes: number;
  optimizer: string | null;
  distribution: string | null;
  accessPredicates: string | null;
  filterPredicates: string | null;
  depth: number;
}

export interface ParallelismDetail {
  qcsid: number;
  dfoNumber: number;
  tqId: number;
  serverType: string;
  numRows: number;
  bytes: number;
  openTime: number;
  avgLatency: number;
}

export interface SQLMonitorDetail extends SQLMonitorEntry {
  planHashValue: number;
  executions: number;
  bufferGets: number;
  diskReads: number;
  diskWrites: number;
  physicalReadRequests: number;
  physicalReadBytes: number;
  physicalWriteRequests: number;
  physicalWriteBytes: number;
  executionPlan: ExecutionPlanStep[];
  parallelism: ParallelismDetail[];
}

export interface SessionInfo {
  sid: number;
  serial: number;
  username: string | null;
  machine: string;
  program: string;
  module: string | null;
  action: string | null;
  logonTime: string;
  lastCallEt: number;
  status: 'ACTIVE' | 'INACTIVE' | 'KILLED';
  state: 'WAITING' | 'ON CPU';
  waitClass: string | null;
  event: string | null;
  secondsInWait: number;
  blockingSession: number | null;
  blockingInstance: number | null;
  sqlId: string | null;
  prevSqlId: string | null;
  pgaAllocatedMB: number;
  pgaUsedMB: number;
}

export interface BlockingChain {
  blocker: SessionInfo;
  blocked: SessionInfo[];
  objectName: string | null;
  lockType: string;
  durationSec: number;
}

export interface DatafileInfo {
  fileId: number;
  fileName: string;
  tablespaceName: string;
  sizeMB: number;
  maxSizeMB: number | null;
  autoextensible: boolean;
  incrementMB: number | null;
  status: string;
  onlineStatus: string;
}

export interface SegmentInfo {
  owner: string;
  segmentName: string;
  segmentType: string;
  sizeMB: number;
  extents: number;
}

export interface GrowthPoint {
  date: string;
  usedMB: number;
  allocatedMB: number;
}

export interface TablespaceDetail extends TablespaceInfo {
  datafiles: DatafileInfo[];
  segments: SegmentInfo[];
  growthTrend: GrowthPoint[];
}

export interface CapacityProjection {
  tablespaceName: string;
  currentUsedMB: number;
  currentFreeMB: number;
  growthRateMBPerDay: number;
  daysUntilWarning: number | null;
  daysUntilCritical: number | null;
  daysUntilFull: number | null;
}

export interface AdvisorPoint {
  parameterValue: number;
  estdDBTime: number;
  estdPhysicalReads: number;
  benefitPct: number;
}

export interface MemoryAdvisor {
  parameter: string;
  currentValue: number;
  advice: AdvisorPoint[];
}

export interface SystemWaitEvent {
  event: string;
  waitClass: string;
  totalWaits: number;
  timeWaitedSec: number;
  avgWaitMs: number;
  pctDBTime: number;
}

export interface SessionWait {
  sid: number;
  serial: number;
  username: string | null;
  event: string;
  waitClass: string;
  state: string;
  secondsInWait: number;
  p1Text: string;
  p1: number;
  p2Text: string;
  p2: number;
  p3Text: string;
  p3: number;
}

export interface LiveWaitClass {
  waitClass: string;
  sessionCount: number;
  totalWaitTimeSec: number;
}

export interface LiveSession {
  sid: number;
  serial: number;
  username: string | null;
  program: string;
  module: string;
  machine: string;
  waitClass: string;
  event: string;
  state: string;
  status: string;
  secondsInWait: number;
  sqlId: string | null;
  lastCallEt: number;
}

export interface LiveWaits {
  waitClasses: LiveWaitClass[];
  sessions: LiveSession[];
  totalActive: number;
}

export interface AlertLogEntry {
  timestamp: string;
  severity: 'CRITICAL' | 'ERROR' | 'WARNING' | 'INFO';
  message: string;
  facility: string;
}

export interface ThresholdConfig {
  tablespaceWarn: number;
  tablespaceCrit: number;
  sessionsWarn: number;
  sessionsCrit: number;
  cpuWarn: number;
  cpuCrit: number;
  waitTimeMsWarn: number;
  waitTimeMsCrit: number;
}

export interface TriggeredAlert {
  id: string;
  metric: string;
  value: number;
  threshold: number;
  severity: 'WARNING' | 'CRITICAL';
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface AWRSnapshot {
  snapId: number;
  dbid: number;
  instanceNumber: number;
  beginTime: string;
  endTime: string;
  durationMin: number;
  startupTime: string;
}

export interface AWRReport {
  html: string;
  dbid: number;
  instanceNumber: number;
  snapIdStart: number;
  snapIdEnd: number;
  generatedAt: string;
  reportType: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'bearer';
  expiresIn: number;
  user: UserInfo;
}

export interface UserInfo {
  id: number;
  username: string;
  email: string;
  role: 'DBA' | 'VIEWER';
  isActive: boolean;
  createdAt: string;
}

export interface MetricPoint {
  timestamp: string;
  value: number;
}

export interface MetricsHistoryResponse {
  hours: number;
  metrics: Record<string, MetricPoint[]>;
}

export interface MetricsAvailableResponse {
  metrics: string[];
}