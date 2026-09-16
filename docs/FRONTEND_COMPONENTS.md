> **Language:** English · [Version française](fr/FRONTEND_COMPONENTS.md)

# Frontend Components Catalog

## Overview

The frontend is built with React 18 + TypeScript using MUI (Material UI) v5 as the component library, TanStack Query for server state management, and Recharts for data visualization.

## Component Structure

```
src/components/
├── common/           # Reusable UI components
├── charts/           # Data visualization components
└── layout/           # Page layout components
```

---

## Common Components

### KPICard
**File:** `src/components/common/KPICard.tsx`

Metric display card with value, unit, trend indicator, and optional icon.

```tsx
interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: number;           // Percentage change
  trendLabel?: string;      // e.g., "vs last hour"
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  icon?: React.ReactNode;
  subtext?: string;
}
```

**Usage:**
```tsx
<KPICard
  title="Active Sessions"
  value={23}
  unit=" / 150"
  trend={-5.2}
  trendLabel="vs last hour"
  color="success"
  icon={<SpeedIcon />}
/>
```

**Features:**
- Hover elevation effect
- Trend arrow (green up / red down)
- Configurable color themes
- Optional icon and subtext

---

### GaugeChart
**File:** `src/components/common/GaugeChart.tsx`

Radial gauge chart using Recharts PieChart for threshold visualization.

```tsx
interface GaugeChartProps {
  value: number;                    // 0-100
  label: string;
  unit?: string;                    // Default: '%'
  thresholds?: { warn: number; crit: number };
  size?: number;                    // Default: 120px
  showLegend?: boolean;
  onClick?: () => void;
  sx?: React.CSSProperties;         // Extra styles (clickable gauge cursor)
}
```

**Usage:**
```tsx
<GaugeChart
  value={85}
  label="USERS Tablespace"
  unit="%"
  thresholds={{ warn: 80, crit: 90 }}
  size={140}
  onClick={() => navigate('/storage')}
/>
```

**Color Logic:**
- Green (`#00A651`): value < warn threshold
- Orange (`#FF8C00`): warn ≤ value < crit
- Red (`#D13438`): value ≥ crit threshold

**Features:**
- Semi-circle gauge with gradient fill
- Center value display with label
- Optional threshold legend
- Click handler for navigation

---

### DataTable
**File:** `src/components/common/DataTable.tsx`

Feature-rich data grid wrapper around MUI X DataGrid Pro.

```tsx
interface DataTableProps<T> {
  rows: T[];
  columns: GridColDef[];
  loading?: boolean;
  error?: Error | null;
  onRowClick?: (row: T) => void;
  pageSize?: number;                // Default: 25
  pageSizeOptions?: number[];       // Default: [10, 25, 50, 100]
  disableSelection?: boolean;
  autoHeight?: boolean;
  maxHeight?: number;               // Default: 500
  checkboxSelection?: boolean;
  onSelectionChange?: (ids: (string | number)[]) => void;
}
```

**Usage:**
```tsx
<DataTable
  rows={sessions}
  columns={[
    { field: 'sid', headerName: 'SID', type: 'number', width: 80 },
    { field: 'username', headerName: 'Username', width: 120 },
    { field: 'status', headerName: 'Status', width: 100, 
      renderCell: (params) => <Chip label={params.value} size="small" /> },
    { field: 'sqlId', headerName: 'SQL ID', width: 140 },
  ]}
  onRowClick={(row) => openDetail(row)}
  checkboxSelection={isDBA}
  onSelectionChange={setSelectedSessions}
/>
```

**Built-in Features:**
- Sorting, filtering, pagination
- Row selection with checkboxes
- Row click navigation
- Loading skeleton state
- Error display with retry
- Responsive height

**Utility Exports:**
```tsx
// Status chip with color coding
statusChip(status: string)

// Format bytes: 1024 → "1 KB"
formatBytes(bytes: number)

// Format duration: 90 → "1m 30s"
formatDuration(seconds: number)

// Truncate text with ellipsis
truncateText(text: string, maxLength: number)
```

---

### LoadingSkeleton
**File:** `src/components/common/LoadingSkeleton.tsx`

Placeholder components for loading states.

```tsx
// Card skeleton
<LoadingSkeleton variant="card" />

// Table skeleton (5 rows)
<LoadingSkeleton variant="table" />

// Chart skeleton
<LoadingSkeleton variant="chart" />

// Pre-built compositions
<KPISkeleton />        // 4 KPI cards grid
<TableSkeleton />      // Table with 5 rows
<ChartSkeleton />      // Empty chart container
```

---

### ErrorDisplay
**File:** `src/components/common/ErrorDisplay.tsx`

Consistent error display with optional retry action.

```tsx
interface ErrorDisplayProps {
  error: Error | string | null;
  onRetry?: () => void;
  title?: string;       // Default: "An error occurred"
}
```

**Usage:**
```tsx
<ErrorDisplay 
  error={error} 
  onRetry={refetch}
  title="Failed to load sessions"
/>
```

---

### RefreshControl
**File:** `src/components/common/RefreshControl.tsx`

Auto-refresh interval selector with manual refresh button. Wired to user settings: the initial
interval and enabled state come from `SettingsContext` (`settings.refreshInterval`,
`settings.autoRefresh`), and a caller-provided `defaultInterval` prop can override the interval.

```tsx
interface RefreshControlProps {
  defaultInterval?: number;      // Override settings interval; falls back to settings.refreshInterval
  onManualRefresh?: () => void;
}
```

**Features:**
- Play/pause toggle for auto-refresh
- Interval dropdown: 5s, 15s, 30s, 60s, Off
- Manual refresh button
- Last/next refresh timestamps
- Integrates with `useAutoRefresh` hook
- Initial interval/enabled seeded from `SettingsContext`

**Intervals:** 5s, 15s, 30s, 60s, 0 (Off)

---

### TimeRangeSelector
**File:** `src/components/common/TimeRangeSelector.tsx`

Time range picker with preset ranges and custom range support.

```tsx
interface TimeRangeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  customRange?: { start: Date; end: Date };
  onCustomRangeChange?: (range: { start: Date; end: Date }) => void;
}
```

**Preset Ranges:**
| Value | Label | Hours |
|-------|-------|-------|
| `5m` | Last 5 minutes | 0.083 |
| `15m` | Last 15 minutes | 0.25 |
| `1h` | Last hour | 1 |
| `6h` | Last 6 hours | 6 |
| `24h` | Last 24 hours | 24 |
| `7d` | Last 7 days | 168 |
| `30d` | Last 30 days | 720 |

**Custom Range:** Date/time picker for arbitrary ranges

---

### DatabaseSelector
**File:** `src/components/common/DatabaseSelector.tsx`

Multi-database connection selector.

```tsx
interface DatabaseSelectorProps {
  databases: { name: string; host: string; status: string }[];
  selected?: string;
  onChange: (name: string) => void;
  onAdd?: () => void;
}
```

**Features:**
- Dropdown with database list
- Status indicator per database
- "Add database" action (future)

---

## Chart Components

### AASChart
**File:** `src/components/charts/AASChart.tsx`

Stacked area chart for Average Active Sessions (ASH) time series.

```tsx
interface AASChartProps {
  data: AASDataPoint[];
  height?: number;                    // Default: 300
  selectedWaitClasses?: string[];     // Filtered wait classes
  onSelectionChange?: (classes: string[]) => void;
}
```

**Data Format:**
```tsx
interface AASDataPoint {
  timestamp: string;
  waitClass: string;
  aas: number;
  samples: number;
}
```

**Features:**
- Stacked area by wait class
- Clickable legend to filter classes
- Gradient fills per wait class
- Tooltip with formatted timestamp
- Color mapping per wait class

**Wait Class Colors:**
| Wait Class | Color |
|------------|-------|
| User I/O | `#0066CC` |
| System I/O | `#00A651` |
| Commit | `#FF8C00` |
| Concurrency | `#D13438` |
| Cluster | `#8B5CF6` |
| Application | `#EC4899` |
| Administrative | `#6B7280` |
| Configuration | `#F59E0B` |
| Network | `#06B6D4` |
| Scheduler | `#84CC16` |
| Queueing | `#F97316` |
| Other | `#9CA3AF` |
| Idle | `#E5E7EB` |

---

### WaitClassChart
**File:** `src/components/charts/WaitClassChart.tsx`

Pie chart for wait class distribution.

```tsx
interface WaitClassChartProps {
  data: Array<{ 
    waitClass: string; 
    samples: number; 
    aas: number; 
    pctTotal: number 
  }>;
  height?: number;      // Default: 300
}
```

**Features:**
- Donut chart with inner radius
- Percentage labels on slices
- Legend with color coding
- Tooltip with sample count

---

### TopSQLChart
**File:** `src/components/charts/TopSQLChart.tsx`

Horizontal bar chart for top SQL statements.

```tsx
interface TopSQLChartProps {
  data: Array<{ 
    sqlId: string; 
    sqlText: string; 
    cpuTimeSec: number; 
    elapsedTimeSec: number;
    executions: number;
  }>;
  height?: number;              // Default: 300
  metric?: 'cpuTimeSec' | 'elapsedTimeSec' | 'executions' | 'bufferGets';
}
```

**Features:**
- Horizontal bars (top 10)
- SQL ID as label (truncated)
- Tooltip shows full SQL text
- Color gradient by rank
- Configurable metric

---

### MemoryBreakdown
**File:** `src/components/charts/MemoryBreakdown.tsx`

Treemap visualization for SGA/PGA memory components.

```tsx
interface MemoryBreakdownProps {
  sga: {
    bufferCacheMB: number;
    sharedPoolMB: number;
    largePoolMB: number;
    javaPoolMB: number;
    streamsPoolMB: number;
    redoLogBufferMB: number;
  };
  pga: {
    totalAllocatedMB: number;
    totalUsedMB: number;
  };
}
```

**Features:**
- Treemap with area proportional to memory size
- SGA and PGA groups
- Color coding per pool
- Tooltip with MB and percentage
- Minimum tile size threshold

**Pool Colors:**
| Pool | Color |
|------|-------|
| Buffer Cache | `#0066CC` |
| Shared Pool | `#00A651` |
| Large Pool | `#FF8C00` |
| Java Pool | `#8B5CF6` |
| Streams Pool | `#EC4899` |
| Redo Log Buffer | `#F59E0B` |
| PGA Allocated | `#6B7280` |
| PGA Used | `#06B6D4` |

---

### TablespaceGauges
**File:** `src/components/charts/TablespaceGauges.tsx`

Grid of radial gauges for tablespace usage.

```tsx
interface TablespaceGaugesProps {
  tablespaces: TablespaceInfo[];
  onClick?: (ts: TablespaceInfo) => void;
}
```

**Features:**
- Responsive grid (1/2/3/4 columns)
- Click navigation to detail
- Reuses GaugeChart component
- Filters out TEMPORARY tablespaces

---

### BlockingTree
**File:** `src/components/charts/BlockingTree.tsx`

Force-directed graph for session blocking chains.

```tsx
interface BlockingTreeProps {
  chains: BlockingChain[];
  onNodeClick?: (session: SessionInfo) => void;
  width?: number;       // Default: '100%'
  height?: number;      // Default: 400
}
```

**Data Format:**
```tsx
interface BlockingChain {
  blocker: SessionInfo;
  blocked: SessionInfo[];
  objectName: string | null;
  lockType: string;
  durationSec: number;
}
```

**Features:**
- Force-directed layout (react-force-graph-2d)
- Blocker nodes (red) → Blocked nodes (orange)
- Node labels: username + SID
- Directional arrows on links
- Drag, zoom, pan interaction
- Right-click context menu (future)
- Click handler for session detail

---

### ExecutionPlan
**File:** `src/components/charts/ExecutionPlan.tsx`

Tree view for SQL execution plan visualization.

```tsx
interface ExecutionPlanProps {
  plan: ExecutionPlanStep[];
  selectedId?: number;
  onSelect?: (step: ExecutionPlanStep) => void;
}
```

**Data Format:**
```tsx
interface ExecutionPlanStep {
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
```

**Features:**
- Hierarchical tree (MUI TreeView)
- Expand/collapse nodes
- Operation icons (TABLE, INDEX, SORT, etc.)
- Cost, cardinality, bytes per node
- Access/filter predicates on hover
- Color coding by operation type

**Operation Colors:**
| Operation | Color |
|-----------|-------|
| TABLE ACCESS | `#0066CC` |
| INDEX | `#00A651` |
| JOIN | `#FF8C00` |
| SORT | `#8B5CF6` |
| AGGREGATE | `#EC4899` |
| VIEW | `#6B7280` |
| FILTER | `#F59E0B` |
| PARTITION | `#06B6D4` |
| REMOTE | `#84CC16` |
| DEFAULT | `#9CA3AF` |

---

### CPURatioChart
**File:** `src/components/charts/CPURatioChart.tsx`

Vertical bar chart for CPU utilization comparison.

```tsx
interface CPURatioChartProps {
  dbCpuPct: number;
  osCpuPct: number;
  dbTimePerSec: number;
  height?: number;      // Default: 200
}
```

**Metrics Displayed:**
- DB CPU % (blue)
- OS CPU % (green)
- DB Time/sec (orange, scaled)

---

### StorageTrendChart
**File:** `src/components/charts/StorageTrendChart.tsx`

Line chart for tablespace growth trend with thresholds.

```tsx
interface StorageTrendChartProps {
  data: Array<{ date: string; usedMB: number; allocatedMB: number }>;
  tablespaceName: string;
  warnThreshold?: number;      // Warning line
  critThreshold?: number;      // Critical line
  maxSize?: number;            // Max size line
  height?: number;             // Default: 300
}
```

**Features:**
- Area chart for allocated space
- Line for used space
- Threshold lines (warning/critical/max)
- Tooltip with formatted date
- Legend with all series

---

## Layout Components

### Sidebar
**File:** `src/components/layout/Sidebar.tsx`

Responsive navigation drawer.

**Features:**
- Permanent on desktop, temporary on mobile
- Menu items with icons
- Active route highlighting
- User info display
- Logout action

**Menu Items:**
| Path | Label | Icon |
|------|-------|------|
| `/` | Dashboard | Dashboard |
| `/instance` | Instance Viewer | Speed |
| `/performance` | Performance Hub | Assessment |
| `/sql-monitor` | SQL Monitor | BugReport |
| `/sessions` | Sessions | Terminal |
| `/storage` | Storage | Storage |
| `/memory` | Memory | Memory |
| `/waits` | Wait Events | Timeline |
| `/live` | Live Monitor | MonitorHeart |
| `/alerts` | Alerts | BugReport |
| `/reports` | Reports | Assessment |
| `/settings` | Settings | Settings |

---

### Header
**File:** `src/components/layout/Header.tsx`

Top app bar with controls.

**Features:**
- App title
- Database selector (multi-db)
- Time range selector
- Auto-refresh control
- **Notifications badge driven by real alert data** — polls `useCheckThresholds()`
  (`GET /alerts/thresholds/check` effectively, i.e. `GET /alerts/check`, 60 s refetch) and renders
  `Badge badgeContent={activeAlerts.length} color="error"`. The notification dropdown lists each
  triggered alert's message, severity, and threshold; empty state: "No active threshold alerts".
- User profile menu (profile → `/settings`, settings → `/settings`, logout)

---

### Footer
**File:** `src/components/layout/Footer.tsx`

Simple footer with version and links (GitHub external link, Documentation → `/settings` in-app link).

---

### PageLayout
**File:** `src/components/layout/PageLayout.tsx`

Wrapper component combining Sidebar, Header, Footer, and content outlet.

```tsx
interface PageLayoutProps {
  onManualRefresh?: () => void;
  timeRange?: string;
  onTimeRangeChange?: (value: string) => void;
  databases?: { name: string; host: string; status: string }[];
  selectedDatabase?: string;
  onDatabaseChange?: (name: string) => void;
}
```

**Usage:**
```tsx
<PageLayout
  timeRange={timeRange}
  onTimeRangeChange={setTimeRange}
  databases={databases}
  selectedDatabase={selectedDatabase}
  onDatabaseChange={setSelectedDatabase}
/>
```

---

## Hooks

### useAutoRefresh
**File:** `src/hooks/useAutoRefresh.ts`

Manages auto-refresh interval state.

```tsx
useAutoRefresh(options?: {
  defaultInterval?: number;   // Default: 30
  enabled?: boolean;          // Default: true
  onRefresh?: () => void;
}): {
  interval: number;
  isEnabled: boolean;
  setInterval: (interval: number) => void;
  toggleEnabled: () => void;
  lastRefresh: Date | null;
  nextRefresh: Date | null;
  triggerRefresh: () => void;
}
```

**Behavior:**
- `onRefresh` is held in a stable ref (`onRefreshRef`) so callers can pass an inline callback
  without resetting the timer on re-render.
- Timer effect: when `isEnabled && interval > 0`, `triggerRefresh()` fires every `interval * 1000` ms.
- `triggerRefresh()` bumps an internal counter, stamps `lastRefresh`, and calls `onRefreshRef.current()`.
- Consumed by `RefreshControl`, which seeds it from settings (`settings.autoRefresh`,
  `settings.refreshInterval`).

**Usage:**
```tsx
const { interval, isEnabled, setInterval, toggleEnabled, lastRefresh, nextRefresh, triggerRefresh } = 
  useAutoRefresh({ defaultInterval: 30, enabled: true, onRefresh: refetchAll });
```

---

### SettingsContext
**File:** `src/context/SettingsContext.tsx`

App-wide user preferences persisted to `localStorage` (key `oracle-monitor-settings`).

```tsx
interface AppSettings {
  theme: 'light' | 'dark';
  autoRefresh: boolean;        // Default true
  refreshInterval: number;     // Default 30
  notifications: boolean;      // Default true
  soundAlerts: boolean;        // Default false
  compactMode: boolean;        // Default false
  timezone: string;            // Default 'UTC'
  language: string;            // Default 'en'
}

useSettings(): {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  resetSettings: () => void;
}
```

**Behavior:**
- Provider wraps the app in `main.tsx`; `ThemedApp` re-creates the MUI theme from
  `settings.theme` (`createAppTheme`).
- Every settings change is written back to `localStorage` (deep-merged over defaults on load).
- Consumed by the Settings page and `RefreshControl`.

---

### AuthContext / ConnectionContext
**Files:** `src/context/AuthContext.tsx`, `src/context/ConnectionContext.tsx`

- `AuthContext` provides `{ user, login, logout, isLoading, isAuthenticated }`. On mount it calls
  `GET /auth/me` to restore a session; `login` posts form-urlencoded credentials to
  `POST /auth/login`, stores tokens (`oracle_monitor_tokens`), then fetches the profile.
- `ConnectionContext` provides `{ connection, setConnection, isConnected }`, persisted to
  `localStorage` key `oracle_monitor_connection`.

---

### useDebounce
**File:** `src/hooks/useDebounce.ts`

Debounce hook for search inputs.

```tsx
function useDebounce<T>(value: T, delay: number): T
```

---

### useLocalStorage
**File:** `src/hooks/useLocalStorage.ts`

Persist state to localStorage.

```tsx
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void]
```

---

### useKeyboardShortcuts
**File:** `src/hooks/useKeyboardShortcuts.ts`

Global keyboard shortcuts handler.

```tsx
interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
}

function useKeyboardShortcuts(shortcuts: KeyboardShortcut[])
```

**Default Shortcuts:**
- `Ctrl+R`: Refresh page
- `Ctrl+K`: Command palette (future)
- `Ctrl+/`: Focus search (future)
- `Escape`: Close dialogs

---

## Theme

### SQL Developer Theme
**File:** `src/theme/theme.ts`

MUI theme customized to match SQL Developer color scheme. Exports:

```tsx
export const sqlDeveloperPalette;                    // Shared palette object
export const theme;                                  // Light theme
export const darkTheme;                              // Dark theme (bg #1E2430, paper #262E3D)
export function createAppTheme(mode: 'light' | 'dark'): Theme;  // Selector used by main.tsx
```

**Color Palette:**
```tsx
primary:    { main: '#0066CC', light: '#4D94DB', dark: '#004499' }
secondary:  { main: '#FF8C00', light: '#FFB340', dark: '#CC7000' }
success:    { main: '#00A651' }
warning:    { main: '#FF8C00' }
error:      { main: '#D13438' }
info:       { main: '#0078D4' }
background: { default: '#F5F7FA', paper: '#FFFFFF' }
```

Dark mode overrides: `background.default #1E2430`, `paper #262E3D`, `divider #3A4356`,
`text.primary #E6E9EF`. The active mode is driven by `SettingsContext.settings.theme`.

**Typography:**
- Font: "Segoe UI", "Helvetica Neue", Arial
- Scale: h1-h6, body1, body2, button, caption, overline

**Component Overrides:**
- Paper: subtle border, no shadow by default
- Buttons: no text-transform, medium weight
- DataGrid: bordered, custom header/row styling
- Tabs: blue indicator, proper height
- Tooltips: rounded, larger padding

---

## Type Definitions

**File:** `src/types/api.ts`

Complete TypeScript interfaces matching backend Pydantic models.

**Key Interfaces:**
- `OverviewData`, `InstanceInfo`, `AASDataPoint`
- `SQLMonitorEntry`, `SQLMonitorDetail`, `ExecutionPlanStep`
- `SessionInfo`, `BlockingChain`
- `TablespaceInfo`, `TablespaceDetail`
- `MemoryAdvisor`, `SystemWaitEvent`
- `AlertLogEntry`, `ThresholdConfig`, `TriggeredAlert`
- `SGAMetrics` — includes optional `sharedPoolFreeMB` (drives the "Shared Pool Free %" KPI on the Memory page)
- `AWRSnapshot` (`snapId, dbid, instanceNumber, beginTime, endTime, durationMin, startupTime`)
- `AWRReport` (`html, dbid, instanceNumber, snapIdStart, snapIdEnd, generatedAt, reportType`)
- `AuthResponse`, `UserInfo`

**DatabaseSelector "Add database":** the dialog (`AddDatabaseDialog.tsx`) tests the connection
server-side via `POST /databases` (rejects 409 duplicate / 422 unreachable), shows a
"Connection tested successfully" alert on success, then auto-closes ~1.2 s later.

---

## Utility Functions

### Formatters
**File:** `src/utils/formatters.ts`
- `formatBytes(bytes, decimals?)` - "1.5 MB"
- `formatDuration(seconds)` - "1h 30m"
- `formatNumber(num, decimals?)` - "1,234"
- `formatPercent(value, decimals?)` - "85.5%"
- `formatTimestamp(date)` - "2024-01-15 10:30:00"
- `formatRelativeTime(date)` - "5m ago"
- `truncateText(text, maxLength?)` - "SELECT * FROM..."
- `getSeverityColor(severity)` - MUI color string
- `getStatusColor(status)` - MUI color string

### Date Helpers
**File:** `src/utils/date.ts`
- `formatDateTime(date, pattern?)` - Custom format
- `formatTime(date)` - "HH:mm:ss"
- `formatDate(date)` - "yyyy-MM-dd"
- `formatRelative(date)` - "5m ago"
- `getTimeRangeHours(range)` - Convert "1h" → 1
- `getTimeRangeStart(range)` - Date object
- `formatDuration(seconds)` - "1h 30m"
- `parseDuration(str)` - "1h 30m" → 5400

### Validators
**File:** `src/utils/validators.ts`
- `validateEmail(email)`
- `validatePassword(password)` - Returns {valid, message}
- `validateHostname(hostname)`
- `validatePort(port)`
- `validateServiceName(service)`
- `validateSQLID(sqlId)` - 13 char alphanumeric
- `validatePositiveNumber(value)`
- `validatePercentage(value)`

### Helpers
**File:** `src/utils/helpers.ts`
- `cn(...classes)` - clsx wrapper
- `debounce(fn, wait)` - Debounced function
- `throttle(fn, limit)` - Throttled function
- `generateId()` - Random ID
- `deepClone(obj)` - JSON clone
- `isEqual(a, b)` - JSON equality
- `omit(obj, keys)` - Remove keys
- `pick(obj, keys)` - Select keys
- `groupBy(array, key)` - Group array by key
- `sortBy(array, key, direction)` - Sort array
- `uniqueBy(array, key)` - Deduplicate by key
- `chunk(array, size)` - Split into chunks
- `flatten(arrays)` - Flatten 2D array