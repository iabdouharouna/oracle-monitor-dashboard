> **Language:** English · [Version française](fr/0005-settings-localstorage.md)

# ADR-0005 — Client-side user preferences (localStorage)

**Status:** Accepted

## Context

The Settings page offers: light/dark theme, auto-refresh on/off, refresh
interval, desktop notifications, sound alerts, compact mode, timezone, and
language. Options: server-side persistence (user profile, database table,
CRUD endpoint) or client-side browser storage.

## Decision

- **Client-side persistence** via `SettingsContext`
  (`src/context/SettingsContext.tsx`).
  - localStorage key: `oracle-monitor-settings`,
  - type: `AppSettings` (`theme, autoRefresh, refreshInterval, notifications,
    soundAlerts, compactMode, timezone, language`);
  - lazy read at mount time with deep merge over defaults
    (`DEFAULT_SETTINGS`), written on every `updateSettings`, `resetSettings`
    restores them.
  - Theme is re-created by `createAppTheme(settings.theme)` in `ThemedApp`
    (`main.tsx`).
- **Other reserved localStorage keys**: `oracle_monitor_tokens` (auth),
  `oracle_monitor_connection` (connection), `selectedDatabase` (active base).

## Consequences

- **Positive**: no server schema, no CRUD endpoint, instant toggle, decoupled
  from the backend.
- **Negative / risks**: settings are not shared across browsers/machines;
  wiped when site data is cleared (no server backup yet); no guarantee in
  private browsing / quota-full → defaults kick in; slight "flash" on first
  paint (light → dark) while storage is read; no sensitive values should ever
  be stored here.