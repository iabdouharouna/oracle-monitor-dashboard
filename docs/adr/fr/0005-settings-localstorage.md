> **Langue :** français · [English version](../0005-settings-localstorage.md)

# ADR-0005 — Préférences utilisateur côté client (localStorage)

**Status:** Accepted

## Context

La page Settings doit proposer : thème clair/sombre, auto-refresh,
intervalle de rafraîchissement, notifications, alertes sonores, mode compact,
fuseau horaire, langue. Deux options : persister côté serveur (profil par
utilisateur, base de données, endpoint CRUD) ou côté client (browser storage).

## Decision

- **Persistance côté client** via `SettingsContext` (`src/context/SettingsContext.tsx`).
  - clé `localStorage: oracle-monitor-settings`,
    type `AppSettings` (`theme, autoRefresh, refreshInterval, notifications,
    soundAlerts, compactMode, timezone, language`) ;
  - lecture paresseuse au montage avec merge sur défauts
    (`DEFAULT_SETTINGS`), écriture à chaque `updateSettings`, `resetSettings` restaure ;
  - le thème est recréé par `createAppTheme(settings.theme)` dans `ThemedApp`
    (`main.tsx`).
- **Autres clés localStorage réservées** : `oracle_monitor_tokens` (auth),
  `oracle_monitor_connection` (connexion), `selectedDatabase` (base active).

## Consequences

- **Positifs** : pas de schéma serveur, pas d'endpoint CRUD, instantané au
  changement, déconnecté du backend.
- **Négatifs / risques** : réglages non partagés entre navigateurs/machines ;
  effacés avec les cookies (pas encore de serveur) ; absence de garantie en
  navigation privée / quota plein → on retombe sur les défauts ; léger « flash »
  de thème au premier rendu (light → dark) ; aucune valeur sensible ne doit y
  figurer.