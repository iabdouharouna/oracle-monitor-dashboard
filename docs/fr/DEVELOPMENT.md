> **Langue :** français · [English version](../DEVELOPMENT.md)

# Guide de développement

## Présentation

Ce guide couvre le flux de développement du Oracle Monitor Dashboard : mise en place, normes de codage, tests et débogage.

## Démarrage rapide

### Prérequis

- Docker & Docker Compose
- Node.js 20+ (pour le développement local du frontend)
- Python 3.11+ (pour le développement local du backend)
- uv (gestionnaire de paquets Python) - `pip install uv`
- Git

### Configuration initiale

```bash
# Cloner le dépôt
git clone <repository-url>
cd oracle-monitor-dashboard

# Copier le modèle d'environnement
cp .env.example .env

# Éditer le .env avec vos réglages
# Minimum requis :
# ORACLE_PASSWORD=your_password
# SECRET_KEY=your-32-char-secret-key

# Démarrer l'environnement de développement
make dev

# Ou avec docker-compose directement :
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d --build
```

### Points d'accès (Développement)

| Service | URL | Notes |
|---------|-----|-------|
| Frontend | http://localhost:3000 | Serveur de dev Vite (port 5173 proxifié) |
| Backend API | http://localhost:8000 | FastAPI avec rechargement automatique |
| API Docs | http://localhost:8000/docs | Swagger UI |
| ReDoc | http://localhost:8000/redoc | Documentation alternative |
| Grafana | http://localhost:3001 | admin/admin |
| Prometheus | http://localhost:9090 | Métriques |

---

## Commandes de développement

### Commandes Makefile

```bash
# Afficher toutes les commandes
make help

# Développement
make dev              # Démarrer l'environnement de développement
make dev-down         # Arrêter l'environnement de développement
make dev-logs         # Suivre les logs
make dev-build        # Reconstruire les images

# Production
make prod             # Démarrer en production
make prod-down        # Arrêter la production
make prod-build       # Construire les images de production

# Base de données
make db-shell         # Shell SQL*Plus
make db-logs          # Logs Oracle

# Backend
make backend-shell    # Bash dans le conteneur backend
make backend-logs     # Logs backend
make backend-test     # Exécuter les tests
make backend-lint     # Linter le code (ruff)
make backend-format   # Formater le code (ruff)
make backend-migrate  # Exécuter les migrations
make backend-makemigrations MSG="message"  # Créer une migration

# Frontend
make frontend-shell   # Shell dans le conteneur frontend
make frontend-logs    # Logs frontend
make frontend-test    # Exécuter les tests
make frontend-lint    # Linter le code (eslint)
make frontend-format  # Formater le code (prettier)
make frontend-build   # Construire pour la production

# Utilitaires
make logs             # Tous les logs
make ps               # État des conteneurs
make clean            # Tout supprimer
make reset            # Réinitialisation complète (clean + dev-build + dev)

# CI
make ci-test          # Tous les tests
make ci-lint          # Tout le linting
```

### Commandes Docker directes

```bash
# Backend
docker exec -it oracle-monitor-backend bash
docker exec oracle-monitor-backend pytest -v
docker exec oracle-monitor-backend ruff check .
docker exec oracle-monitor-backend ruff format .

# Frontend
docker exec -it oracle-monitor-frontend sh
docker exec oracle-monitor-frontend npm run test
docker exec oracle-monitor-frontend npm run lint
docker exec oracle-monitor-frontend npm run format

# Base de données
docker exec -it oracle-monitor-db sqlplus monitor/password@FREE
docker logs -f oracle-monitor-db
```

---

## Développement backend

### Structure du projet

```
backend/
├── app/
│   ├── api/routes/       # Points de terminaison de l'API
│   ├── core/             # Modules principaux
│   ├── services/         # Logique métier
│   ├── tasks/            # Tâches Celery
│   └── utils/            # Helpers
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── alembic/              # Migrations
├── pyproject.toml        # Dépendances
└── Dockerfile
```

### Ajouter un point de terminaison d'API

1. **Créer le fichier de route** dans `app/api/routes/` :

```python
# app/api/routes/new_feature.py
from fastapi import APIRouter, Query
from app.services.new_feature_service import NewFeatureService

router = APIRouter()

@router.get("/endpoint")
async def get_data(param: str = Query(...)):
    return await NewFeatureService.get_data(param)
```

2. **Créer le service** dans `app/services/` :

```python
# app/services/new_feature_service.py
from app.database import oracle_pool
from app.core.oracle_queries import NEW_QUERY

class NewFeatureService:
    @staticmethod
    async def get_data(param: str):
        return await oracle_pool.execute_query(NEW_QUERY, {"param": param})
```

3. **Ajouter la requête** dans `app/core/oracle_queries.py` :

```python
NEW_QUERY = """
SELECT * FROM some_view WHERE column = :param
"""
```

4. **Enregistrer la route** dans `app/api/routes/__init__.py` :

```python
from app.api.routes import new_feature
# Ajouter à __all__
```

5. **Inclure dans main.py** :

```python
from app.api.routes import new_feature
app.include_router(new_feature.router, prefix=f"{settings.API_PREFIX}/new-feature", tags=["New Feature"])
```

### Ajouter une requête de base de données

1. Ajouter le SQL à `app/core/oracle_queries.py` avec des placeholders de paramètres
2. Utiliser des paramètres nommés : `:param_name`
3. Pour les requêtes dynamiques, créer une fonction qui renvoie la chaîne de requête

```python
# Requête paramétrée
MY_QUERY = """
SELECT col1, col2 
FROM my_table 
WHERE id = :id 
  AND status = :status
"""

# Constructeur de requête dynamique
def get_dynamic_query(filter_col: str) -> str:
    valid_cols = {'col1', 'col2', 'col3'}
    if filter_col not in valid_cols:
        raise ValueError(f"Invalid column: {filter_col}")
    return f"SELECT * FROM my_table WHERE {filter_col} = :value"
```

### Migrations de base de données

```bash
# Créer une nouvelle migration
make backend-makemigrations MSG="add new_feature table"

# Appliquer les migrations
make backend-migrate

# Vérifier l'état des migrations
docker exec oracle-monitor-backend alembic current
docker exec oracle-monitor-backend alembic history
```

**Structure du fichier de migration :**
```python
# alembic/versions/xxxx_add_new_feature.py
def upgrade():
    op.create_table('new_feature', ...)

def downgrade():
    op.drop_table('new_feature')
```

### Tester le backend

```bash
# Exécuter tous les tests
make backend-test

# Exécuter un fichier de test spécifique
docker exec oracle-monitor-backend pytest tests/unit/test_formatting.py -v

# Exécuter avec couverture
docker exec oracle-monitor-backend pytest --cov=app --cov-report=html

# Exécuter les tests d'intégration (requiert Oracle)
docker exec oracle-monitor-backend pytest tests/integration/ -v
```

**Structure des tests :**
```
tests/
├── conftest.py              # Fixtures
├── unit/
│   ├── test_formatting.py   # Tests unitaires
│   ├── test_oracle_queries.py
│   └── test_services.py
├── integration/
│   ├── test_api_overview.py
│   ├── test_api_instance.py
│   └── test_api_performance.py
└── fixtures/
    └── sample_data.py
```

**Exemple de test unitaire :**
```python
# tests/unit/test_formatting.py
import pytest
from app.utils.formatting import format_bytes, format_duration

def test_format_bytes():
    assert format_bytes(0) == "0 B"
    assert format_bytes(1024) == "1.00 KB"
    assert format_bytes(1024**3) == "1.00 GB"

def test_format_duration():
    assert format_duration(30) == "30.0s"
    assert format_duration(90) == "1m 30s"
```

**Exemple de test d'intégration :**
```python
# tests/integration/test_api_overview.py
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_overview_endpoint(client: AsyncClient, auth_headers):
    response = await client.get("/api/v1/overview", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "database" in data
    assert "sessions" in data
```

### Linting et formatage

```bash
# Linter
make backend-lint
# ou
docker exec oracle-monitor-backend ruff check .

# Formater
make backend-format
# ou
docker exec oracle-monitor-backend ruff format .
```

**Configuration Ruff** (`pyproject.toml`) :
```toml
[tool.ruff]
line-length = 100
target-version = "py311"
select = ["E", "F", "I", "N", "W", "UP", "B", "C4", "PL", "RUF", "SIM", "TID", "TRY"]
ignore = ["E501", "TRY003"]
fixable = ["ALL"]

[tool.ruff.format]
quote-style = "double"
indent-style = "space"
```

---

## Développement frontend

### Structure du projet

```
frontend/
├── src/
│   ├── api/
│   │   ├── client.ts          # Instance Axios
│   │   ├── queryClient.ts     # Config TanStack Query
│   │   ├── hooks/             # Hooks des fonctionnalités
│   │   └── websocket.ts       # Hook WebSocket
│   ├── components/
│   │   ├── common/            # UI réutilisable
│   │   ├── charts/            # Composants Recharts
│   │   └── layout/            # Composants de mise en page
│   ├── pages/                 # Composants de pages
│   ├── context/               # Contextes React
│   ├── theme/                 # Thème MUI
│   ├── types/                 # Types TypeScript
│   ├── hooks/                 # Hooks personnalisés
│   └── utils/                 # Helpers
├── tests/
│   ├── unit/
│   └── e2e/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── Dockerfile
```

### Ajouter une nouvelle page

1. **Créer le composant de page** dans `src/pages/` :

```tsx
// src/pages/NewPage.tsx
import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { useNewFeature } from '../api/hooks/useNewFeature';
import { DataTable, LoadingSkeleton } from '../components/common';

export const NewPage: React.FC = () => {
  const { data, isLoading, error } = useNewFeature();

  if (isLoading) return <LoadingSkeleton variant="table" />;
  if (error) return <ErrorDisplay error={error} />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h4" fontWeight={600}>New Feature</Typography>
      <Paper sx={{ p: 2 }}>
        <DataTable
          rows={data?.map((d, i) => ({ id: i, ...d })) || []}
          columns={[
            { field: 'name', headerName: 'Name', flex: 1 },
            { field: 'value', headerName: 'Value', type: 'number' },
          ]}
        />
      </Paper>
    </Box>
  );
};
```

2. **Créer le hook** dans `src/api/hooks/useNewFeature.ts` :

```typescript
// src/api/hooks/useNewFeature.ts
import { useQuery } from '@tanstack/react-query';
import apiClient from '../client';
import type { NewFeatureData } from '../../types/api';

export function useNewFeature() {
  return useQuery({
    queryKey: ['new-feature'],
    queryFn: async () => {
      const { data } = await apiClient.get<NewFeatureData[]>('/new-feature/endpoint');
      return data;
    },
    refetchInterval: 30000,
  });
}
```

3. **Exporter le hook** dans `src/api/hooks/index.ts` :

```typescript
export * from './useNewFeature';
```

4. **Ajouter les types** dans `src/types/api.ts` :

```typescript
export interface NewFeatureData {
  id: number;
  name: string;
  value: number;
}
```

4. **Ajouter la route** dans `src/App.tsx` :

```tsx
import { NewPage } from './pages';

<Route path="/new-feature" element={<NewPage />} />
```

5. **Ajouter au menu latéral** dans `src/components/layout/Sidebar.tsx` :

```tsx
const menuItems = [
  // ...
  { path: '/new-feature', label: 'New Feature', icon: <NewIcon /> },
];
```

### Ajouter un composant de graphique

1. **Créer le graphique** dans `src/components/charts/` :

```tsx
// src/components/charts/MyChart.tsx
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface MyChartProps {
  data: Array<{ name: string; value: number }>;
  height?: number;
}

export const MyChart: React.FC<MyChartProps> = ({ data, height = 300 }) => {
  if (!data.length) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      No data available
    </div>;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="value" fill="#0066CC" />
      </BarChart>
    </ResponsiveContainer>
  );
};
```

2. **Exporter** dans `src/components/charts/index.ts` :

```typescript
export { MyChart } from './MyChart';
```

### Gestion d'état avec TanStack Query

```typescript
// Requête avec paramètres
const { data } = useQuery({
  queryKey: ['feature', { param: value }],
  queryFn: () => apiClient.get('/endpoint', { params: { param: value } }),
  enabled: !!value,  // Ne récupérer que lorsque le param est présent
  staleTime: 30000,
  refetchInterval: 30000,
});

// Mutation
const mutation = useMutation({
  mutationFn: (payload) => apiClient.post('/endpoint', payload),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['feature'] });
  },
});

// Utilisation
mutation.mutate({ name: 'test' });
```

**Rafraîchissement manuel / automatique :** le `RefreshControl` dans l'en-tête enveloppe
`useAutoRefresh` et appelle un callback `onManualRefresh` lorsque l'utilisateur rafraîchit ou que
l'intervalle (issu des réglages) se déclenche. Câblage typique dans une page :

```tsx
const handleRefresh = () => {
  queryClient.refetchQueries({ type: 'active' });   // rafraîchit toutes les requêtes actives
  // ou ciblé : queryClient.invalidateQueries({ queryKey: ['feature'] });
};
...
<RefreshControl onManualRefresh={handleRefresh} />
```

`useAutoRefresh` garde le callback dans une ref stable, donc passer un handler en ligne ne
réinitialise pas le minuteur. L'état initial de l'intervalle/d'activation provient de
`SettingsContext` (`settings.refreshInterval`, `settings.autoRefresh`).

### Tester le frontend

```bash
# Tests unitaires
make frontend-test

# Mode watch
docker exec oracle-monitor-frontend npm run test

# Mode UI
docker exec oracle-monitor-frontend npm run test:ui

# Tests E2E
make frontend-test-e2e
```

**Exemple de test unitaire :**
```typescript
// tests/unit/components/KPICard.test.tsx
import { render, screen } from '@testing-library/react';
import { KPICard } from '../../components/common/KPICard';

describe('KPICard', () => {
  it('renders title and value', () => {
    render(<KPICard title="Test" value={100} unit="%" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('renders trend when provided', () => {
    render(<KPICard title="Test" value={100} trend={5.5} />);
    expect(screen.getByText('↑ 5.5%')).toBeInTheDocument();
  });
});
```

**Exemple de test E2E :**
```typescript
// tests/e2e/dashboard.spec.ts
import { test, expect } from '@playwright/test';

test('dashboard loads and shows KPI cards', async ({ page }) => {
  await page.goto('/');
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'admin123');
  await page.click('button[type="submit"]');
  
  await expect(page.locator('text=Dashboard Overview')).toBeVisible();
  await expect(page.locator('text=Active Sessions')).toBeVisible();
});
```

### Linting et formatage

```bash
# Linter
make frontend-lint
# ou
docker exec oracle-monitor-frontend npm run lint

# Formater
make frontend-format
# ou
docker exec oracle-monitor-frontend npm run format
```

**Configuration ESLint** (`.eslintrc.json`) :
```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "plugins": ["react-refresh", "@typescript-eslint"],
  "rules": {
    "react-refresh/only-export-components": ["warn", { "allowConstantExport": true }],
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }]
  }
}
```

**Configuration Prettier** (`.prettierrc`) :
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "avoid"
}
```

---

## Débogage

### Débogage du backend

**Configuration de lancement VS Code** (`.vscode/launch.json`) :
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Python: FastAPI",
      "type": "python",
      "request": "launch",
      "module": "uvicorn",
      "args": ["app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"],
      "cwd": "${workspaceFolder}/backend",
      "env": { "PYTHONPATH": "${workspaceFolder}/backend" }
    }
  ]
}
```

**Débogage dans le conteneur :**
```bash
# Installer debugpy dans le backend
docker exec oracle-monitor-backend pip install debugpy

# Exécuter avec le débogueur
docker exec oracle-monitor-backend python -m debugpy --listen 0.0.0.0:5678 -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Débogage du frontend

**React DevTools :**
- Installer l'extension navigateur React Developer Tools
- Onglets Components et Profiler disponibles

**Configuration de débogage VS Code :**
```json
{
  "type": "chrome",
  "request": "launch",
  "name": "Launch Chrome against localhost",
  "url": "http://localhost:3000",
  "webRoot": "${workspaceFolder}/frontend/src"
}
```

**Débogage Vite :**
- Ouvrir DevTools → Sources → webpack:// → src
- Définir des points d'arrêt dans le code source TypeScript

### Débogage de la base de données

```bash
# Se connecter à Oracle
make db-shell

# Ou directement
docker exec -it oracle-monitor-db sqlplus monitor/password@FREE

# Requêtes utiles
SELECT * FROM v$session WHERE type = 'USER';
SELECT * FROM v$active_session_history WHERE sample_time > SYSDATE - 1/24;
SELECT * FROM v$sql_monitor WHERE status LIKE 'EXECUTING%';
```

### Analyse des logs

```bash
# Logs backend avec filtrage
make backend-logs | grep ERROR
make backend-logs | grep -i "sql_monitor"

# Parsing des logs structurés
make backend-logs | jq 'select(.level=="ERROR")'

# Suivre un service spécifique
docker logs -f oracle-monitor-backend 2>&1 | grep -E "(ERROR|WARN)"
```

---

## Workflow Git

### Stratégie de branches

```
main                    # Prêt pour la production
├── develop             # Branche d'intégration
│   ├── feature/xyz     # Branches de fonctionnalités
│   ├── bugfix/abc      # Corrections de bugs
│   └── hotfix/def      # Correctifs urgents
```

### Convention de commit

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types :**
- `feat` : Nouvelle fonctionnalité
- `fix` : Correction de bug
- `docs` : Documentation
- `style` : Formatage
- `refactor` : Restructuration de code
- `test` : Tests
- `chore` : Maintenance

**Exemples :**
```
feat(api): add SQL monitor detail endpoint
fix(frontend): resolve blocking tree rendering issue
docs(api): update SQL monitor API documentation
refactor(backend): extract Oracle queries to separate module
test(integration): add SQL monitor integration tests
```

### Processus de pull request

1. Créer une branche de fonctionnalité depuis `develop`
2. Faire les modifications avec des tests
2. Exécuter le linting et les tests localement
3. Pousser la branche et créer la PR
4. La CI s'exécute automatiquement
5. Revue de code (1 approbation requise)
6. Squash et merge vers `develop`

---

## Normes de qualité du code

### Python (Backend)

- **Type hints** requis pour toutes les fonctions
- **Docstrings** pour les fonctions/classes publiques
- **Async/await** pour les opérations I/O
- **Modèles Pydantic** pour les requêtes/réponses
- **Journalisation structurée** avec structlog
- **Gestion des erreurs** avec des exceptions personnalisées

### TypeScript (Frontend)

- **Mode strict** activé
- **Types explicites** pour les props et l'état
- **Interface** pour les formes d'objets
- **Imports de types uniquement** avec `import type`
- **Pas de `any`** - utiliser `unknown` ou des génériques
- **Composants fonctionnels** avec des hooks

### Général

- **Noms explicites** - pas d'abréviations
- **Fonctions courtes** - responsabilité unique
- **DRY** - extraire la logique commune
- **Commentaires** - le pourquoi, pas le quoi
- **Tests** - les nouvelles fonctionnalités nécessitent des tests

---

## Profilage des performances

### Backend

```python
# Ajouter le timing aux méthodes de service
import time
from functools import wraps

def timed(func):
    @wraps(func)
    async def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = await func(*args, **kwargs)
        duration = (time.perf_counter() - start) * 1000
        logger.debug(f"{func.__name__} took {duration:.2f}ms")
        return result
    return wrapper
```

### Frontend

```typescript
// Profiler des React DevTools
// Envelopper le composant avec <Profiler id="MyComponent" onRender={onRender}>

// Marque de performance personnalisée
performance.mark('feature-start');
// ... code ...
performance.mark('feature-end');
performance.measure('feature', 'feature-start', 'feature-end');
```

---

## Gestion des dépendances

### Backend (uv)

```bash
# Ajouter une dépendance
cd backend && uv add package-name

# Ajouter une dépendance de dev
cd backend && uv add --dev package-name

# Mettre à jour le fichier de lock
cd backend && uv lock --upgrade

# Synchroniser les dépendances
cd backend && uv sync --all-extras
```

### Frontend (npm)

```bash
# Ajouter une dépendance
cd frontend && npm install package-name

# Ajouter une dépendance de dev
cd frontend && npm install -D package-name

# Mettre à jour
cd frontend && npm update

# Audit
cd frontend && npm audit
```

---

## Tâches de développement courantes

### Réinitialiser la base de données

```bash
# Réinitialisation complète
make clean
make dev-build
make dev

# Ou réinitialiser uniquement Oracle
docker-compose down oracle
docker volume rm oracle-monitor-dashboard_oracle_data
make dev
```

### Vider le cache

```bash
# Redis
docker exec oracle-monitor-redis redis-cli FLUSHALL

# Frontend
docker exec oracle-monitor-frontend rm -rf node_modules/.vite
```

### Reconstruire un service

```bash
docker-compose build backend
docker-compose up -d --no-deps backend
```

### Voir les requêtes en cours

```bash
# Oracle
SELECT sql_text, elapsed_time/1e6 as secs 
FROM v$sql_monitor 
WHERE status LIKE 'EXECUTING%';

# Log des requêtes backend
make backend-logs | grep "Executing query"
```