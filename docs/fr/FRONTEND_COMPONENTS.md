> **Langue :** français · [English version](../FRONTEND_COMPONENTS.md)

# Catalogue des Composants Frontend

## Vue d'ensemble

Le frontend est construit avec React 18 + TypeScript, utilisant MUI (Material UI) v5 comme bibliothèque de composants, TanStack Query pour la gestion de l'état serveur, et Recharts pour la visualisation de données.

## Structure des Composants

```
src/components/
├── common/           # Composants UI réutilisables
├── charts/           # Composants de visualisation de données
└── layout/           # Composants de mise en page
```

---

## Composants Communs

### KPICard
**Fichier:** `src/components/common/KPICard.tsx`

Carte d'affichage de métrique avec valeur, unité, indicateur de tendance et icône optionnelle.

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

**Utilisation:**
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

**Fonctionnalités:**
- Effet d'élévation au survol
- Flèche de tendance (vert haut / rouge bas)
- Thèmes de couleurs configurables
- Icône et sous-texte optionnels

---

### GaugeChart
**Fichier:** `src/components/common/GaugeChart.tsx`

Jauge radiale utilisant Recharts PieChart pour la visualisation de seuils.

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

**Utilisation:**
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

**Logique de couleur:**
- Vert (`#00A651`) : valeur < seuil d'avertissement
- Orange (`#FF8C00`) : avertissement ≤ valeur < critique
- Rouge (`#D13438`) : valeur ≥ seuil critique

**Fonctionnalités:**
- Jauge demi-cercle avec dégradé
- Affichage de la valeur centrale avec libellé
- Légende des seuils optionnelle
- Gestionnaire de clic pour la navigation

---

### DataTable
**Fichier:** `src/components/common/DataTable.tsx`

Composant de grille de données riche, encapsulant MUI X DataGrid Pro.

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

**Utilisation:**
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

**Fonctionnalités intégrées:**
- Tri, filtrage, pagination
- Sélection de lignes avec cases à cocher
- Navigation par clic sur ligne
- État de squelette de chargement
- Affichage d'erreur avec réessai
- Hauteur responsive

**Exports utilitaires:**
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
**Fichier:** `src/components/common/LoadingSkeleton.tsx`

Composants de placeholder pour les états de chargement.

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
**Fichier:** `src/components/common/ErrorDisplay.tsx`

Affichage d'erreur cohérent avec action de réessai optionnelle.

```tsx
interface ErrorDisplayProps {
  error: Error | string | null;
  onRetry?: () => void;
  title?: string;       // Default: "An error occurred"
}
```

**Utilisation:**
```tsx
<ErrorDisplay 
  error={error} 
  onRetry={refetch}
  title="Failed to load sessions"
/>
```

---

### RefreshControl
**Fichier:** `src/components/common/RefreshControl.tsx`

Sélecteur d'intervalle de rafraîchissement automatique avec bouton de rafraîchissement manuel. Connecté aux paramètres utilisateur : l'intervalle initial et l'état activé proviennent de `SettingsContext` (`settings.refreshInterval`,
`settings.autoRefresh`), et une prop `defaultInterval` fournie par l'appelant peut remplacer l'intervalle.

```tsx
interface RefreshControlProps {
  defaultInterval?: number;      // Override settings interval; falls back to settings.refreshInterval
  onManualRefresh?: () => void;
}
```

**Fonctionnalités:**
- Bouton play/pause pour le rafraîchissement automatique
- Menu déroulant d'intervalle : 5s, 15s, 30s, 60s, Désactivé
- Bouton de rafraîchissement manuel
- Horodatages du dernier/prochain rafraîchissement
- Intégration avec le hook `useAutoRefresh`
- Intervalle/activé initial seeding depuis `SettingsContext`

**Intervalles:** 5s, 15s, 30s, 60s, 0 (Désactivé)

---

### TimeRangeSelector
**Fichier:** `src/components/common/TimeRangeSelector.tsx`

Sélecteur de plage de temps avec plages prédéfinies et support de plage personnalisée.

```tsx
interface TimeRangeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  customRange?: { start: Date; end: Date };
  onCustomRangeChange?: (range: { start: Date; end: Date }) => void;
}
```

**Plages prédéfinies:**
| Valeur | Libellé | Heures |
|--------|---------|--------|
| `5m` | 5 dernières minutes | 0.083 |
| `15m` | 15 dernières minutes | 0.25 |
| `1h` | Dernière heure | 1 |
| `6h` | 6 dernières heures | 6 |
| `24h` | 24 dernières heures | 24 |
| `7d` | 7 derniers jours | 168 |
| `30d` | 30 derniers jours | 720 |

**Plage personnalisée:** Sélecteur date/heure pour des plages arbitraires

---

### DatabaseSelector
**Fichier:** `src/components/common/DatabaseSelector.tsx`

Sélecteur de connexion multi-base de données.

```tsx
interface DatabaseSelectorProps {
  databases: { name: string; host: string; status: string }[];
  selected?: string;
  onChange: (name: string) => void;
  onAdd?: () => void;
}
```

**Fonctionnalités:**
- Menu déroulant avec liste des bases de données
- Indicateur de statut par base de données
- Action « Ajouter une base de données » (futur)

---

## Composants de Graphiques

### AASChart
**Fichier:** `src/components/charts/AASChart.tsx`

Graphique en aires empilées pour la série temporelle des Sessions Actives Moyennes (ASH).

```tsx
interface AASChartProps {
  data: AASDataPoint[];
  height?: number;                    // Default: 300
  selectedWaitClasses?: string[];     // Filtered wait classes
  onSelectionChange?: (classes: string[]) => void;
}
```

**Format de données:**
```tsx
interface AASDataPoint {
  timestamp: string;
  waitClass: string;
  aas: number;
  samples: number;
}
```

**Fonctionnalités:**
- Aires empilées par classe d'attente
- Légende cliquable pour filtrer les classes
- Dégradés par classe d'attente
- Info-bulle avec horodatage formatué
- Correspondance de couleurs par classe d'attente

**Couleurs des classes d'attente:**
| Classe d'attente | Couleur |
|------------------|---------|
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
**Fichier:** `src/components/charts/WaitClassChart.tsx`

Graphique en camembert pour la distribution des classes d'attente.

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

**Fonctionnalités:**
- Graphique donut avec rayon intérieur
- Étiquettes de pourcentage sur les parts
- Légende avec codage couleur
- Info-bulle avec nombre d'échantillons

---

### TopSQLChart
**Fichier:** `src/components/charts/TopSQLChart.tsx`

Graphique en barres horizontales pour les instructions SQL les plus consommatrices.

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

**Fonctionnalités:**
- Barres horizontales (top 10)
- SQL ID comme libellé (tronqué)
- Info-bulle affichant le texte SQL complet
- Dégradé de couleur par classement
- Métrique configurable

---

### MemoryBreakdown
**Fichier:** `src/components/charts/MemoryBreakdown.tsx`

Visualisation en treemap pour les composants mémoire SGA/PGA.

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

**Fonctionnalités:**
- Treemap avec surface proportionnelle à la taille mémoire
- Groupes SGA et PGA
- Codage couleur par pool
- Info-bulle avec MB et pourcentage
- Seuil de taille minimum des tuiles

**Couleurs des pools:**
| Pool | Couleur |
|------|---------|
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
**Fichier:** `src/components/charts/TablespaceGauges.tsx`

Grille de jauges radiales pour l'utilisation des tablespaces.

```tsx
interface TablespaceGaugesProps {
  tablespaces: TablespaceInfo[];
  onClick?: (ts: TablespaceInfo) => void;
}
```

**Fonctionnalités:**
- Grille responsive (1/2/3/4 colonnes)
- Navigation par clic vers le détail
- Réutilisation du composant GaugeChart
- Filtre les tablespaces TEMPORARY

---

### BlockingTree
**Fichier:** `src/components/charts/BlockingTree.tsx`

Graphe dirigé pour les chaînes de blocage de sessions.

```tsx
interface BlockingTreeProps {
  chains: BlockingChain[];
  onNodeClick?: (session: SessionInfo) => void;
  width?: number;       // Default: '100%'
  height?: number;      // Default: 400
}
```

**Format de données:**
```tsx
interface BlockingChain {
  blocker: SessionInfo;
  blocked: SessionInfo[];
  objectName: string | null;
  lockType: string;
  durationSec: number;
}
```

**Fonctionnalités:**
- Disposition dirigée (react-force-graph-2d)
- Nœuds bloquants (rouge) → Nœuds bloqués (orange)
- Étiquettes de nœuds : nom d'utilisateur + SID
- Flèches directionnelles sur les liens
- Interaction glisser, zoomer, déplacer
- Menu contextuel clic droit (futur)
- Gestionnaire de clic pour le détail de session

---

### ExecutionPlan
**Fichier:** `src/components/charts/ExecutionPlan.tsx`

Vue arbre pour la visualisation des plans d'exécution SQL.

```tsx
interface ExecutionPlanProps {
  plan: ExecutionPlanStep[];
  selectedId?: number;
  onSelect?: (step: ExecutionPlanStep) => void;
}
```

**Format de données:**
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

**Fonctionnalités:**
- Arbre hiérarchique (MUI TreeView)
- Déplier/replier les nœuds
- Icônes d'opération (TABLE, INDEX, SORT, etc.)
- Coût, cardinalité, octets par nœud
- Prédicats d'accès/filtrage au survol
- Codage couleur par type d'opération

**Couleurs des opérations:**
| Opération | Couleur |
|-----------|---------|
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
**Fichier:** `src/components/charts/CPURatioChart.tsx`

Graphique en barres verticales pour la comparaison d'utilisation CPU.

```tsx
interface CPURatioChartProps {
  dbCpuPct: number;
  osCpuPct: number;
  dbTimePerSec: number;
  height?: number;      // Default: 200
}
```

**Métriques affichées:**
- DB CPU % (bleu)
- OS CPU % (vert)
- DB Time/sec (orange, mis à l'échelle)

---

### StorageTrendChart
**Fichier:** `src/components/charts/StorageTrendChart.tsx`

Graphique en ligne pour la tendance de croissance des tablespaces avec seuils.

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

**Fonctionnalités:**
- Graphique en aire pour l'espace alloué
- Ligne pour l'espace utilisé
- Lignes de seuil (avertissement/critique/max)
- Info-bulle avec date formatuée
- Légende avec toutes les séries

---

## Composants de Mise en Page

### Sidebar
**Fichier:** `src/components/layout/Sidebar.tsx`

Menu de navigation responsive.

**Fonctionnalités:**
- Permanent sur bureau, temporaire sur mobile
- Éléments de menu avec icônes
- Surbrillance de la route active
- Affichage des informations utilisateur
- Action de déconnexion

**Éléments de menu:**
| Chemin | Libellé | Icône |
|--------|---------|-------|
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
**Fichier:** `src/components/layout/Header.tsx`

Barre supérieure de l'application avec contrôles.

**Fonctionnalités:**
- Titre de l'application
- Sélecteur de base de données (multi-db)
- Sélecteur de plage de temps
- Contrôle de rafraîchissement automatique
- **Badge de notifications piloté par les données d'alertes réelles** — interroge `useCheckThresholds()`
  (`GET /alerts/thresholds/check` en pratique, c'est-à-dire `GET /alerts/check`, rechargement toutes les 60 s) et affiche
  `Badge badgeContent={activeAlerts.length} color="error"`. Le menu déroulant de notifications liste le message,
  la sévérité et le seuil de chaque alerte déclenchée ; état vide : « No active threshold alerts ».
- Menu de profil utilisateur (profil → `/settings`, paramètres → `/settings`, déconnexion)

---

### Footer
**Fichier:** `src/components/layout/Footer.tsx`

Pied de page simple avec version et liens (lien externe GitHub, Documentation → lien interne `/settings`).

---

### PageLayout
**Fichier:** `src/components/layout/PageLayout.tsx`

Composant conteneur combinant Sidebar, Header, Footer et le contenu principal.

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

**Utilisation:**
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
**Fichier:** `src/hooks/useAutoRefresh.ts`

Gère l'état de l'intervalle de rafraîchissement automatique.

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

**Comportement:**
- `onRefresh` est conservé dans une ref stable (`onRefreshRef`) pour que les appelants puissent passer un callback en ligne
  sans réinitialiser le timer lors du re-rendu.
- Effet du timer : lorsque `isEnabled && interval > 0`, `triggerRefresh()` se déclenche toutes les `interval * 1000` ms.
- `triggerRefresh()` incrémente un compteur interne, horodate `lastRefresh` et appelle `onRefreshRef.current()`.
- Utilisé par `RefreshControl`, qui le configure depuis les paramètres (`settings.autoRefresh`,
  `settings.refreshInterval`).

**Utilisation:**
```tsx
const { interval, isEnabled, setInterval, toggleEnabled, lastRefresh, nextRefresh, triggerRefresh } = 
  useAutoRefresh({ defaultInterval: 30, enabled: true, onRefresh: refetchAll });
```

---

### SettingsContext
**Fichier:** `src/context/SettingsContext.tsx`

Préférences utilisateur de l'application persistées dans `localStorage` (clé `oracle-monitor-settings`).

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

**Comportement:**
- Le provider enveloppe l'application dans `main.tsx` ; `ThemedApp` recrée le thème MUI à partir de
  `settings.theme` (`createAppTheme`).
- Chaque changement de paramètre est écrit dans `localStorage` (fusion profonde par rapport aux valeurs par défaut au chargement).
- Utilisé par la page Settings et `RefreshControl`.

---

### AuthContext / ConnectionContext
**Fichiers:** `src/context/AuthContext.tsx`, `src/context/ConnectionContext.tsx`

- `AuthContext` fournit `{ user, login, logout, isLoading, isAuthenticated }`. Au montage, il appelle
  `GET /auth/me` pour restaurer une session ; `login` envoie des identifiants au format form-urlencoded vers
  `POST /auth/login`, stocke les jetons (`oracle_monitor_tokens`), puis récupère le profil.
- `ConnectionContext` fournit `{ connection, setConnection, isConnected }`, persisté dans
  `localStorage` avec la clé `oracle_monitor_connection`.

---

### useDebounce
**Fichier:** `src/hooks/useDebounce.ts`

Hook de debouncing pour les champs de recherche.

```tsx
function useDebounce<T>(value: T, delay: number): T
```

---

### useLocalStorage
**Fichier:** `src/hooks/useLocalStorage.ts`

Persister un état dans localStorage.

```tsx
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void]
```

---

### useKeyboardShortcuts
**Fichier:** `src/hooks/useKeyboardShortcuts.ts`

Gestionnaire de raccourcis clavier globaux.

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

**Raccourcis par défaut:**
- `Ctrl+R` : Rafraîchir la page
- `Ctrl+K` : Palette de commandes (futur)
- `Ctrl+/` : Focus sur la recherche (futur)
- `Escape` : Fermer les dialogues

---

## Thème

### Thème SQL Developer
**Fichier:** `src/theme/theme.ts`

Thème MUI personnalisé pour correspondre au jeu de couleurs de SQL Developer. Exports :

```tsx
export const sqlDeveloperPalette;                    // Shared palette object
export const theme;                                  // Light theme
export const darkTheme;                              // Dark theme (bg #1E2430, paper #262E3D)
export function createAppTheme(mode: 'light' | 'dark'): Theme;  // Selector used by main.tsx
```

**Jeu de couleurs:**
```tsx
primary:    { main: '#0066CC', light: '#4D94DB', dark: '#004499' }
secondary:  { main: '#FF8C00', light: '#FFB340', dark: '#CC7000' }
success:    { main: '#00A651' }
warning:    { main: '#FF8C00' }
error:      { main: '#D13438' }
info:       { main: '#0078D4' }
background: { default: '#F5F7FA', paper: '#FFFFFF' }
```

Remplacements du mode sombre : `background.default #1E2430`, `paper #262E3D`, `divider #3A4356`,
`text.primary #E6E9EF`. Le mode actif est piloté par `SettingsContext.settings.theme`.

**Typographie :**
- Police : "Segoe UI", "Helvetica Neue", Arial
- Échelle : h1-h6, body1, body2, button, caption, overline

**Remplacements de composants :**
- Paper : bordure subtile, pas d'ombre par défaut
- Boutons : pas de text-transform, graisse moyenne
- DataGrid : bordures, style personnalisé d'en-tête/ligne
- Tabs : indicateur bleu, hauteur correcte
- Tooltips : arrondis, padding plus grand

---

## Définitions de Types

**Fichier:** `src/types/api.ts`

Interfaces TypeScript complètes correspondant aux modèles Pydantic du backend.

**Interfaces principales :**
- `OverviewData`, `InstanceInfo`, `AASDataPoint`
- `SQLMonitorEntry`, `SQLMonitorDetail`, `ExecutionPlanStep`
- `SessionInfo`, `BlockingChain`
- `TablespaceInfo`, `TablespaceDetail`
- `MemoryAdvisor`, `SystemWaitEvent`
- `AlertLogEntry`, `ThresholdConfig`, `TriggeredAlert`
- `SGAMetrics` — inclut `sharedPoolFreeMB` optionnel (pilote le KPI « Shared Pool Free % » de la page Mémoire)
- `AWRSnapshot` (`snapId, dbid, instanceNumber, beginTime, endTime, durationMin, startupTime`)
- `AWRReport` (`html, dbid, instanceNumber, snapIdStart, snapIdEnd, generatedAt, reportType`)
- `AuthResponse`, `UserInfo`

**« Ajouter une base de données » de DatabaseSelector :** le dialogue (`AddDatabaseDialog.tsx`) teste la connexion
côté serveur via `POST /databases` (rejette 409 doublon / 422 injoignable), affiche une
alerte « Connection tested successfully » en cas de succès, puis se ferme automatiquement ~1.2 s plus tard.

---

## Fonctions Utilitaires

### Formatteurs
**Fichier:** `src/utils/formatters.ts`
- `formatBytes(bytes, decimals?)` - "1.5 MB"
- `formatDuration(seconds)` - "1h 30m"
- `formatNumber(num, decimals?)` - "1,234"
- `formatPercent(value, decimals?)` - "85.5%"
- `formatTimestamp(date)` - "2024-01-15 10:30:00"
- `formatRelativeTime(date)` - "5m ago"
- `truncateText(text, maxLength?)` - "SELECT * FROM..."
- `getSeverityColor(severity)` - chaîne de couleur MUI
- `getStatusColor(status)` - chaîne de couleur MUI

### Assistants de Date
**Fichier:** `src/utils/date.ts`
- `formatDateTime(date, pattern?)` - Format personnalisé
- `formatTime(date)` - "HH:mm:ss"
- `formatDate(date)` - "yyyy-MM-dd"
- `formatRelative(date)` - "5m ago"
- `getTimeRangeHours(range)` - Convertir "1h" → 1
- `getTimeRangeStart(range)` - Objet Date
- `formatDuration(seconds)` - "1h 30m"
- `parseDuration(str)` - "1h 30m" → 5400

### Validateurs
**Fichier:** `src/utils/validators.ts`
- `validateEmail(email)`
- `validatePassword(password)` - Renvoie {valid, message}
- `validateHostname(hostname)`
- `validatePort(port)`
- `validateServiceName(service)`
- `validateSQLID(sqlId)` - 13 caractères alphanumériques
- `validatePositiveNumber(value)`
- `validatePercentage(value)`

### Helpers
**Fichier:** `src/utils/helpers.ts`
- `cn(...classes)` - Wrapper clsx
- `debounce(fn, wait)` - Fonction débounced
- `throttle(fn, limit)` - Fonction throttled
- `generateId()` - ID aléatoire
- `deepClone(obj)` - Clonage JSON
- `isEqual(a, b)` - Égalité JSON
- `omit(obj, keys)` - Supprimer des clés
- `pick(obj, keys)` - Sélectionner des clés
- `groupBy(array, key)` - Grouper un tableau par clé
- `sortBy(array, key, direction)` - Trier un tableau
- `uniqueBy(array, key)` - Dédoublonner par clé
- `chunk(array, size)` - Découper en morceaux
- `flatten(arrays)` - Aplatir un tableau 2D
