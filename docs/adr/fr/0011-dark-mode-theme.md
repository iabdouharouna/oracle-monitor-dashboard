> **Langue :** français · [English version](../0011-dark-mode-theme.md)

# ADR-0011 — Thème clair/sombre centralisé via `createAppTheme(mode)`

**Status:** Accepted

## Context

La page Settings propose un mode clair/sombre. Initialement le thème sombre
était annoncé comme « futur » dans la documentation, le thème MUI étant un
seul objet « SQL Developer ». Il fallait rendre le toggle réel et éviter de
dupliquer la palette dans chaque composant.

## Decision

- **`frontend/src/theme/theme.ts`** expose :
  - `theme` (clair — SQL Developer, export conservé) ;
  - `darkTheme` (palette sombre : `background.default: rgb(30,36,48)`,
    surfaces/focus ajustés) ;
  - **`createAppTheme(mode: 'light' | 'dark')`** pour recréer le thème selon
    le mode.
- **`main.tsx`** : `ThemedApp` lit `useSettings()` puis fournit
  `createAppTheme(settings.theme)` via `ThemeProvider` + `CssBaseline`.
- La bascule est pilotée par `SettingsContext` / `Settings.tsx` et persiste en
  localStorage (voir ADR-0005).

## Consequences

- **Positifs** : un seul point de définition de thème, bascule réelle
  (vérifiée aussi visuellement et par source), documentation alignée
  (`docs/CONFIGURATION.md` ne mentionne plus « future »).
- **Négatifs / risques** : flash blanc→sombre au premier paint le temps du
  read localStorage ; les composants qui utilisent des couleurs MUI dérivées
  (`theme.palette`) restent cohérents, mais toute couleur en dur (ex. dégradés
  de USB) doit être ré-évaluée pour le mode sombre.