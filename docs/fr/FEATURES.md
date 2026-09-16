> **Langue :** français · [English version](../FEATURES.md)

# Documentation des fonctionnalités

## Vue d'ensemble

L'Oracle Monitor Dashboard reproduit les capacités de surveillance de SQL Developer, organisé en 10 modules fonctionnels accessibles via la barre latérale de navigation.

---

## 1. Tableau de bord (Overview)

**Route :** `/`
**API :** `GET /api/v1/overview`
**Rafraîchissement :** 30 secondes (configurable)

### Fonctionnalités

| Composant | Description | Source de données |
|-----------|-------------|-------------------|
| **État de la base** | Nom, version, hôte, plateforme, état (OPEN/MOUNTED), rôle, uptime | `v$instance`, `v$database` |
| **Résumé des alertes** | Nombre de critiques/avertissements/info issus des vérifications de seuils | `AlertService.check_thresholds()` |
| **Aperçu du stockage** | Total/Utilisé/Libre GB, % utilisé, nombre de tablespaces, nombre critiques | `dba_tablespaces` + `dba_free_space` |
| **Résumé des sessions** | Total/Actives/Inactives/Bloquées, % actives | `v$session` |
| **Performance I/O** | Lecture/Écriture Mo/s, IOPS, latence moyenne | `v$sysmetric`, `v$iostat_function` |
| **Événements d'attente** | Top 5 des classes d'attente par % du temps BD | `v$system_event` |

### Visualisations

- **4 cartes KPI** - État, Stockage, Sessions, CPU
- **Graphique AAS** (placeholder) - Tendance des sessions actives moyennes
- **Camembert des classes d'attente** - Distribution des principales classes d'attente
- **Barres Top SQL** - Top 10 par temps CPU
- **Ratio CPU** - CPU BD vs CPU OS vs Temps BD
- **Jauges de tablespace** - Jauges radiales par tablespace
- **Grille résumé I/O** - Lecture/Écriture Mo/s, latence
- **Grille stats rapides** - Version, plateforme, hôte, rôle, sessions bloquées, tablespaces critiques

### Actions

- Bouton de rafraîchissement manuel
- Sélecteur d'intervalle de rafraîchissement automatique (5s, 15s, 30s, 60s, Désactivé)
- Sélecteur de plage temporelle pour la vue historique
- Liens rapides vers les pages détaillées

---

## 2. Visualiseur d'instance

**Route :** `/instance`
**API :** `GET /api/v1/instance/*`
**Rafraîchissement :** 30-300 secondes par panneau

### Onglets

#### Base de données
**API :** `GET /instance/info`
**Données :** Nom de l'instance, version, hôte, plateforme, heure de démarrage, mode de journalisation, rôle, numéro d'instance, uptime

#### Clients
**API :** `GET /instance/clients`
**Données :** Sessions regroupées par machine, programme, module avec les compteurs
**Source :** `v$session` groupées par machine/programme/module

#### Processus
**API :** `GET /instance/processes`
**Données :** Nombre de processus, taux d'exécution, taux de parsing, curseurs ouverts, taux commit/rollback
**Source :** `v$process`, `v$sysstat`

#### Mémoire
**API :** `GET /instance/memory`
**Composants :**
- **Décomposition SGA** - Buffer Cache, Shared Pool, Large Pool, Java Pool, Streams Pool, Redo Log Buffer, Fixed SGA
- **PGA** - Cible agrégée, alloué, utilisé, % hit du cache, max alloué
- **Ratios** - % hit du buffer cache, % hit du library cache
**Sources :** `v$sgastat`, `v$sgainfo`, `v$pgastat`, `v$librarycache`, `v$sysstat`

#### Stockage
**API :** `GET /instance/storage`
**Composants :**
- **Tablespaces** - Nom, type, état, taille/utilisé/libre Mo, % utilisé, autoextend, taille max
- **Journaux de redolog** - Groupe, membres, taille, état, commutations/heure
- **Taux d'archivage** - Archives/heure, Mo/heure
**Sources :** `dba_tablespaces`, `dba_data_files`, `dba_free_space`, `v$log`, `v$log_history`, `v$archived_log`

#### Ratio CPU
**API :** `GET /instance/cpu-ratio`
**Données :** CPU BD %, CPU arrière-plan %, Temps BD/sec
**Source :** `v$sys_time_model`, `v$osstat`

#### Top SQL
**API :** `GET /instance/top-sql?limit=10`
**Données :** SQL ID, plan hash, exécutions, temps CPU/écoulé, buffer gets, lectures disque, lignes, texte SQL
**Source :** `v$sqlstats`

### Visualisations

- Cartes KPI pour chaque métrique
- Treemap mémoire (décomposition SGA/PGA)
- Jauges radiales de tablespace
- Diagramme à barres groupées du ratio CPU
- Tableau de données Top SQL avec colonnes triables

---

## 3. Performance Hub (ASH Analytics)

**Route :** `/performance`
**API :** `GET /api/v1/performance/ash/*`
**Rafraîchissement :** 10-30 secondes

### Fonctionnalités

#### Graphique série temporelle AAS
**API :** `GET /performance/ash/aas?hours=1&dimension=wait_class`
**Visualisation :** Graphique en aires empilées montrant les sessions actives moyennes au fil du temps
**Dimensions :** Classe d'attente, Événement, SQL ID, Nom d'utilisateur, Machine, Module, Action
**Interaction :** Cliquer sur la légende pour filtrer les classes d'attente
**Résolution :** Échantillons de 10 secondes → AAS par minute

#### Décomposition des classes d'attente
**API :** `GET /performance/ash/wait-classes?hours=1`
**Visualisation :** Graphique donut avec étiquettes de pourcentage
**Données :** Échantillons, AAS, % du total par classe d'attente

#### Top SQL par ASH
**API :** `GET /performance/ash/top-sql?hours=1`
**Données :** SQL ID, échantillons, AAS, % temps BD, aperçu du texte SQL
**Source :** `v$active_session_history` + `v$sql`

#### Tableaux de drill-down
**API :** `GET /performance/ash/drilldown?dimension=wait_class&filter_dimension=sql_id&hours=1`
**Fonction :** Analyse de dimension secondaire (ex : SQL IDs par classe d'attente)
**Résultat :** Valeur de la dimension, valeur du filtre, échantillons, AAS, % total

#### Sélecteur de plage temporelle
Préréglages : 5m, 15m, 1h, 6h, 24h, 7j, 30j
Personnalisé : sélecteur de date/heure pour des plages arbitraires

### Intégration AWR (nécessite le Diagnostics Pack)

| Fonctionnalité | API | Description |
|----------------|-----|-------------|
| Snapshots | `GET /performance/awr/snapshots` | Lister les snapshots AWR (30 jours) |
| Rapport | `GET /performance/awr/report` | Générer un rapport HTML/Text pour une plage de snapshots |

**Détails de la génération de rapport :**
- `report_type` accepte `html` (par défaut) ou `text`.
- Sélectionner une plage qui traverse un redémarrage d'instance renvoie une erreur conviviale : choisissez une plage dans une
  seule fenêtre de démarrage (le backend convertit `ORA-20019` en HTTP 400).
- Le rapport est délivré sous la forme d'une seule chaîne concaténée (le package Oracle renvoie le rapport sous
  forme de CLOB réparti sur plusieurs lignes).

> Les endpoints `compare` et `sql-history` ne sont **pas** implémentés ; la page Rapports expose l'onglet
> Rapport AWR et un onglet ASH informatif. Le top SQL historique issu de `dba_hist_sqlstat` est défini dans
> le catalogue de requêtes mais n'est pas exposé via l'API.

---

## 4. SQL Monitor

**Route :** `/sql-monitor`
**API :** `GET /api/v1/sql-monitor/*`
**Rafraîchissement :** 5 secondes

#### Liste SQL active
**API :** `GET /sql-monitor/active`
**Données :** SQL monitorés en temps réel depuis `v$sql_monitor`
**Colonnes :** Statut, SQL ID, Exec ID, Utilisateur, Module, Durée, CPU, I/O, PX, Heure de début, Texte SQL
**Indicateurs de statut :**
- 🟢 EXECUTING (bleu)
- ✅ DONE (vert)
- ❌ ERROR (rouge)
- ⚠️ FIRST N ROWS (orange)

#### Vue détaillée SQL
**API :** `GET /sql-monitor/detail?sql_id=xxx&sql_exec_id=123`
**Composants :**

1. **Cartes de résumé** - Statut, Durée, CPU, I/O, Serveurs PX, Buffer Gets, Lectures disque, Heure de début
2. **Texte SQL** - Formaté, coloré syntaxiquement (monospace)
3. **Plan d'exécution** - Vue arborescente avec :
   - Opération/Options/Objet
   - Coût, Cardinalité, Octets
   - Prédicats d'accès/filtrage
   - Codé par couleur selon le type d'opération
4. **Détails de parallélisme** - DFO, TQ, Type de serveur, Lignes, Octets, Latence
5. **Statistiques** - Toutes les métriques d'exécution dans une grille clé/valeur

#### Visualisation du plan d'exécution
**API :** `GET /sql-monitor/plan?sql_id=xxx&plan_hash_value=yyy`
**Composant :** `ExecutionPlan` - Arbre hiérarchique (MUI TreeView)
**Fonctionnalités :** Développer/replier, icônes d'opération, coût/lignes/octets par nœud

#### SQL historique (Diagnostics Pack)
**API :** `GET /sql-monitor/history`
**Source :** `dba_hist_sql_monitor`

---

## 5. Sessions

**Route :** `/sessions`
**API :** `GET /api/v1/sessions/*`
**Rafraîchissement :** 15 secondes

#### Liste des sessions
**API :** `GET /sessions?status=&username=&machine=&min_duration=`
**Filtres :** Statut, Nom d'utilisateur, Machine, Durée minimale
**Colonnes :** SID, Serial#, Nom d'utilisateur, Machine, Programme, Module, Connexion, Dernier appel, Statut, État, Classe d'attente, Événement, Secondes en attente, SID bloquant, SQL ID, PGA utilisé

#### Arbre de blocage
**API :** `GET /sessions/blocking`
**Visualisation :** Graphe orienté force (react-force-graph-2d)
**Nœuds :**
- Rouge = Bloquant (actif)
- Orange = Bloqué
**Arêtes :** Flèches directionnelles (bloquant → bloqué)
**Interaction :** Glisser, zoomer, panoramiquer, cliquer pour les détails, menu contextuel clic droit

#### Opérations de longue durée
**API :** `GET /sessions/long-ops`
**Source :** `v$session_longops`
**Colonnes :** SID, Serial#, Opération, Cible, % Terminé, Écoulé, Restant, Message

#### Actions de session (DBA uniquement)
**API :** `POST /sessions/{sid}/{serial}/kill`
**Nécessite :** Rôle DBA (backend `get_current_dba` — 403 pour `VIEWER`) ; `ENABLE_KILL_SESSION` est un
flag de configuration qui actuellement n'est **pas** vérifié par la route de kill.
**Frontend :** la sélection de lignes n'est activée que lorsque `user.role === 'DBA'`, et un
bouton **"Kill Selected (n)"** émet une mutation de kill pour chaque paire `sid,serial` sélectionnée (les identifiants de
sélection sont des chaînes `"sid,serial"`), puis efface la sélection.
**Confirmation :** Dialogue de confirmation du navigateur
**Audit :** Journalisé avec nom d'utilisateur/horodatage

### Visualisations

- KPIs de résumé de session (Total, Actives, Bloquées, Opérations longues)
- Grille de données filtrable et triable (MUI DataGrid)
- Arbre de blocage avec disposition orientée force
- Tableau des opérations de longue durée

---

## 6. Stockage

**Route :** `/storage`
**API :** `GET /api/v1/storage/*`
**Rafraîchissement :** 60 secondes (tablespaces), 5 min (capacité)

### Onglets

#### Tablespaces permanents/undo
**API :** `GET /storage/tablespaces`
**Données :** Nom, Type, État, Taille/Utilisé/Libre Mo, % Utilisé, Autoextend, Taille max
**Actions :** Cliquer sur une ligne → Panneau de détails

#### Tablespaces temporaires
**API :** Même endpoint, filtré par type
**Données :** Mêmes colonnes (pas d'autoextend en général)

#### Planification de capacité
**API :** `GET /storage/capacity`
**Algorithme :** Régression linéaire sur la croissance de 30 jours (`dba_hist_tbspc_space_usage`)
**Projections :** Jours jusqu'à Avertissement/Critique/Plein
**Nécessite :** Diagnostics Pack + 2+ points de données

#### Panneau de détails de tablespace
**API :** `GET /storage/tablespaces/{name}`
**Composants :**

1. **Graphique jauge** - % d'utilisation avec seuils
2. **Métriques clés** - Taille, Utilisé, Libre Mo
3. **Graphique de tendance de croissance** - Graphique en ligne avec :
   - Espace utilisé (ligne)
   - Espace alloué (aire)
   - Lignes de seuil Avertissement/Critique/Max
4. **Tableau des datafiles** - File#, Nom, Taille, Max, Autoextend, Incrément, État, En ligne
5. **Top segments** - Propriétaire, Nom, Type, Taille, Extents (top 20)

### Visualisations

- **Grille de jauges de tablespace** - Grille responsive de jauges radiales
- **Tableau de planification de capacité** - Taux de croissance, jours avant les seuils
- **Graphique de tendance du stockage** - Croissance historique avec seuils
- **Tableaux DataFiles/segments** avec tri

---

## 7. Mémoire

**Route :** `/memory`
**API :** `GET /api/v1/memory/*`
**Rafraîchissement :** 5 minutes

#### Configuration courante
**Affiche :** Décomposition SGA/PGA (depuis le visualiseur d'instance)
**Composants :** Buffer Cache, Shared Pool, Large Pool, Java Pool, Streams Pool, Redo Buffer, PGA Alloué/Utilisé

#### Conseillers (nécessite le Diagnostics Pack)

| Conseiller | API | Paramètres |
|------------|-----|------------|
| SGA Target | `GET /memory/sga-advice` | Facteur de taille, facteur temps BD, facteur lectures physiques, % de bénéfice |
| PGA Target | `GET /memory/pga-advice` | Facteur cible, facteur temps BD, facteur lectures physiques, % de bénéfice |
| Memory Target (AMM) | `GET /memory/memory-target-advice` | Facteur de taille, facteur temps BD, facteur lectures physiques, % de bénéfice |

#### Ratios clés
**KPIs :** % hit du Buffer Cache, % hit du Library Cache, % hit du cache PGA, % libre du Shared Pool

Le KPI **% libre du Shared Pool** est calculé à partir de données réelles : le backend expose
`sharedPoolFreeMB` dans les métriques SGA (`GET /instance/memory`), et la page Mémoire dérive le
pourcentage comme `sharedPoolFreeMB / sharedPoolMB * 100`.

### Visualisations

- Treemap mémoire (décomposition SGA/PGA)
- Tableaux de données des conseillers avec % de bénéfice
- Cartes KPI pour les ratios clés

---

## 8. Événements d'attente

**Route :** `/waits`
**API :** `GET /api/v1/waits/*`
**Rafraîchissement :** 15-60 secondes

### Onglets

#### Attentes système
**API :** `GET /waits/system`
**Source :** `v$system_event` (non-idle)
**Colonnes :** Événement, Classe d'attente, Total des attentes, Temps attendu (sec), Attente moy. (ms), % Temps BD
**Tri :** Par temps attendu décroissant

#### Attentes de session
**API :** `GET /waits/session`
**Source :** `v$session_wait` + `v$session`
**Colonnes :** SID, Serial#, Nom d'utilisateur, Événement, Classe d'attente, État, Secondes en attente, P1/P2/P3

#### Tendances historiques
**API :** `GET /waits/history?hours=24`
**Source :** `v$sysmetric_history`
**Métriques :** Lectures/Ecritures physiques/sec, Temps BD/sec, Utilisation CPU/sec
**Visualisation :** Graphiques en ligne par métrique

#### Résumé des métriques I/O
**API :** `GET /waits/io-metrics`
**KPIs :**
- Lectures/Ecritures physiques par sec
- Lecture/Écriture Mo/s
- Redo généré Mo/s
- Temps BD/sec
- Utilisation CPU/sec
- Connexions/sec
- Latence moy. de lecture/écriture (ms)

### Visualisations

- Camembert des classes d'attente
- Tableau des 20 principaux événements d'attente
- Tableau des attentes de session
- Graphiques en ligne des métriques historiques (Recharts)

---

## 9. Alertes

**Route :** `/alerts`
**API :** `GET /api/v1/alerts/*`
**Rafraîchissement :** 60 secondes

#### Journal d'alertes
**API :** `GET /alerts/log?hours=24&limit=100`
**Source :** `v$diag_alert_ext`
**Colonnes :** Horodatage, Sévérité, Message, Installation
**Sévérités :** CRITICAL, ERROR, WARNING, INFO

#### Configuration des seuils
**API :** `GET/PUT /alerts/thresholds`
**Seuils modifiables :**

| Seuil | Défaut | Plage |
|-------|--------|-------|
| Tablespace Avertissement % | 80 | 50-95 |
| Tablespace Critique % | 90 | 60-99 |
| Sessions Avertissement % | 70 | 50-90 |
| Sessions Critique % | 85 | 60-95 |
| CPU Avertissement % | 80 | 50-95 |
| CPU Critique % | 90 | 60-99 |
| Temps d'attente Avertissement (ms) | 100 | 10-1000 |
| Temps d'attente Critique (ms) | 500 | 50-5000 |

**Interface :** Grille éditable avec Sauvegarder/Annuler, entrées numériques avec min/max
**Persistance :** l'enregistrement émet un `PUT /alerts/thresholds` avec `Partial<ThresholdConfig>` ; le
backend persiste les remplacements dans `config/thresholds.json` (prioritaire sur les defaults env) et renvoie la
configuration fusionnée complète. Le succès/erreur est affiché via un Snackbar.

#### Alertes de seuil actives
**API :** `GET /alerts/check`
**Évaluation en temps réel par rapport aux métriques courantes**
**Résultat :** Métrique, valeur, seuil, sévérité, message, horodatage, flag d'acquittement

### Visualisations

- Tableau du journal d'alertes avec pastilles de sévérité
- Grille de configuration des seuils (éditable)
- Tableau des alertes actives avec pastilles de sévérité
- Rafraîchissement manuel + rafraîchissement automatique

---

## 10. Rapports

**Route :** `/reports`
**API :** `GET /api/v1/performance/awr/*` (rapport AWR), `GET /api/v1/exports/*` (CSV)

### Types de rapports

| Rapport | Description | Format | Implémenté |
|---------|-------------|--------|------------|
| Rapport AWR | Dépôt de charge pour une plage de snapshots | HTML, Texte | ✅ |
| Rapport ASH | Historique des sessions actives pour une plage temporelle | — | ❌ (onglet informatif) |
| AWR Compare Period | Comparer deux périodes de snapshots | — | ❌ |
| Rapport SQL | Analyse détaillée pour une requête SQL spécifique | — | ❌ |

### Génération de rapport (AWR)
1. Charger les snapshots réels (`GET /performance/awr/snapshots`) dans les listes déroulantes début/fin
2. Choisir le format (HTML/Texte)
3. Générer via `GET /performance/awr/report?snap_id_start=&snap_id_end=&report_type=`
4. Aperçu dans un dialogue — HTML rendu dans un `<iframe srcDoc>` intégré, texte dans un bloc `<pre>`
5. Export : télécharger le HTML ou le Texte via Blob

**Erreurs :** une plage de snapshots qui traverse un redémarrage d'instance affiche une bannière visible avec le
message convivial du backend (choisissez une plage dans une seule fenêtre de démarrage).

### Export CSV
**API :** `GET /exports/{sessions|tablespaces|sql-monitor}/csv`
**Téléchargement :** Fichier CSV avec les données filtrées courantes

> Il n'y a pas d'historique de « rapports récents » — chaque rapport généré est prévisualisé et exporté depuis le
> dialogue en direct.

---

## 11. Paramètres

**Route :** `/settings`
**API :** aucune (côté client, persisté dans `localStorage` via `SettingsContext`)

### Profil
Affichage en lecture seule de l'utilisateur authentifié (nom d'utilisateur, email, rôle).

### Apparence
| Paramètre | Effet |
|-----------|-------|
| Mode sombre | Bascule instantanément le thème MUI via `createAppTheme(settings.theme)` (persisté) |
| Mode compact | Préférence persistée (appliquée là où c'est supporté) |
| Fuseau horaire / Langue | Préférence persistée |

### Surveillance
| Paramètre | Effet |
|-----------|-------|
| Rafraîchissement auto activé | Initialise l'état activé de chaque `RefreshControl` |
| Notifications du navigateur | Demande la permission réelle `Notification` ; le bouton reste désactivé si refusé |
| Alertes sonores | Préférence persistée |
| Intervalle de rafraîchissement (5-120s) | Initialise l'intervalle de chaque `RefreshControl` |

### Notifications
« Envoyer une notification de test » émet une vraie notification `Notification` du navigateur et affiche l'état de la permission.

### Sécurité / Rétention de données
Ces sections sont désactivées avec une note informative — changement de mot de passe, clés API, 2FA, gestion de
session et configuration webhook/rétention nécessitent un support côté serveur qui n'est pas
implémenté. Un bouton « Rétablir les paramètres par défaut » restaure les réglages d'usine.

### À propos
Résumé de la version, stack frontend/backend.

---

## Fonctionnalités transversales

### Mises à jour en temps réel (WebSocket)
**Canaux :** `overview`, `sql_monitor`, `sessions`, `performance`
**Protocole :** WebSocket avec reconnexion automatique, heartbeat
**Throttling :** Canal performance avec intervalle minimum de 5s

### Contrôle du rafraîchissement automatique
**Global :** Sélecteur d'intervalle de rafraîchissement par page (`RefreshControl`)
**Options :** 5s, 15s, 30s, 60s, Désactivé
**Persisté :** dans `SettingsContext` → `localStorage` (`oracle-monitor-settings`) ; l'intervalle
initial et l'état activé de chaque `RefreshControl` proviennent de ces paramètres, et la page Paramètres
permet à l'utilisateur de les configurer.

### Notifications d'en-tête
Le badge de la cloche d'en-tête est piloté par des **données de seuil réelles** : il interroge `useCheckThresholds()`
(`GET /alerts/check`, 60 s) et affiche le nombre d'alertes déclenchées dans un badge rouge. Le menu déroulant
liste le message/sévérité/seuil de chaque alerte (état vide : « Pas d'alertes de seuil actives »).

### Sélection de plage temporelle
**Global :** Cohérent sur toutes les pages à séries temporelles
**Préréglages :** 5m, 15m, 1h, 6h, 24h, 7j, 30j
**Personnalisé :** Sélecteur de plage date/heure

### Support multi-base de données
**Sélecteur :** Sélecteur de base de données en direct dans l'en-tête alimenté par `GET /api/v1/databases`
**Connexion :** Pool de connexions par base de données (un pool `oracledb` par base configurée)
**Routage :** Base de données active commutée par requête via l'en-tête `X-Database` (contextvar)
**État :** Indicateurs En ligne/Hors ligne avec latence (probe `SELECT` en direct par base)
**Gestion :** Dialogue « Ajouter une base... » qui teste la connectivité avant de persister (CRUD via POST/DELETE)
**Config :** Variable d'env `DATABASES_JSON` (liste JSON) et/ou fichier persisté `config/databases.json` ; PRIMARY toujours issue de `ORACLE_*`

Exemple de `DATABASES_JSON` :
```json
[
  {"name": "FREE2", "host": "oradb-free", "port": 1521, "serviceName": "freepdb1",
   "username": "monitor", "password": "secret", "isDefault": false}
]
```

### Capacités d'export
| Page | Export |
|------|--------|
| Sessions | CSV |
| Tablespaces | CSV |
| SQL Monitor | CSV |
| Rapports | HTML, Texte (AWR) |

### Accès basé sur les rôles
| Fonctionnalité | DBA | Viewer |
|----------------|-----|--------|
| Voir toutes les pages | ✅ | ✅ |
| Tuer une session (y compris Kill Selected) | ✅ | ❌ |
| Modifier les seuils | ✅ | ❌ |
| Générer AWR | ✅ | ✅ |
| Ajouter/supprimer des bases de données | ✅ | ❌ |

> Note : la grille d'édition des seuils est actuellement rendue pour tous les rôles ; les endpoints `POST/DELETE
> /databases` et kill côté backend vérifient le rôle DBA.

### Raccourcis clavier
| Raccourci | Action |
|-----------|--------|
| `Ctrl+R` | Rafraîchir la page courante |
| `Ctrl+K` | Palette de commandes (futur) |
| `Escape` | Fermer les dialogues |

### Accessibilité
- HTML sémantique
- Étiquettes ARIA sur les éléments interactifs
- Contraste de couleurs (WCAG AA)
- Navigation au clavier
- Gestion du focus
- Compatible lecteur d'écran
