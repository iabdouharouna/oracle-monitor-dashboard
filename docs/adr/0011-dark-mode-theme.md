> **Language:** English · [Version française](fr/0011-dark-mode-theme.md)

# ADR-0011 — Light/dark theme centralized via `createAppTheme(mode)`

**Status:** Accepted

## Context

The Settings page proposes a light/dark toggle. Initially the dark theme was
labelled as "future" in the documentation while the MUI theme was a single
"SQL Developer" object. We needed to make the toggle real and avoid
duplicating the palette in every component.

## Decision

- **`frontend/src/theme/theme.ts`** exposes:
  - `theme` (light — SQL Developer palette, export kept for backward compatibility);
  - `darkTheme` (dark palette: `background.default: rgb(30,36,48)`, adjusted
    surfaces/focus colors);
  - **`createAppTheme(mode: 'light' | 'dark')`** to recreate the theme on mode change.
- **`main.tsx`**: `ThemedApp` reads `useSettings()` and provides
  `createAppTheme(settings.theme)` via `ThemeProvider` + `CssBaseline`.
- The toggle is driven by `SettingsContext` / `Settings.tsx` and persisted in
  localStorage (see ADR-0005).

## Consequences

- **Positive**: single definition point for the theme, real toggle (verified
  visually and via source), aligned documentation (`docs/CONFIGURATION.md` no
  longer says "future").
- **Negative / risks**: white→dark flash on first paint while localStorage is
  read; components using MUI derived colors (`theme.palette`) stay coherent,
  but any hardcoded color (e.g. gradient blobs) must be re-evaluated for dark
  mode.