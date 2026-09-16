> **Langue :** français · [English version](../CONTRIBUTING.md)

# Lignes de Contribution

## Bienvenue

Merci pour votre intérêt à contribuer au Oracle Monitor Dashboard ! Ce document fournit les directives pour contribuer au projet.

## Code de Conduite

En participant à ce projet, vous acceptez de respecter notre Code de Conduite :

- Soyez respectueux et inclusif
- Accueillez les nouveaux et aidez-les à apprendre
- Concentrez-vous sur les retours constructifs
- Acceptez la critique avec élégance
- Priorisez les meilleurs intérêts du projet

## Comment Contribuer

### Signaler des Problèmes

Avant de créer un ticket, veuillez :

1. **Rechercher les tickets existants** - Évitez les doublons
2. **Utiliser le modèle de ticket** - Fournissez toutes les informations demandées
3. **Soyez précis** - Incluez les étapes pour reproduire, comportement attendu vs réel
4. **Incluez l'environnement** - OS, version Docker, version Oracle, journaux d'erreurs

**Types de tickets :**
- 🐛 **Bug** - Quelque chose ne fonctionne pas comme prévu
- ✨ **Demande de Fonctionnalité** - Nouvelle fonctionnalité
- 📚 **Documentation** - Améliorations de la doc
- 🔧 **Refactoring** - Améliorations du code
- ❓ **Question** - Aide à l'utilisation

### Suggérer des Fonctionnalités

1. Ouvrez un ticket **Demande de Fonctionnalité**
2. Décrivez le cas d'utilisation et le problème résolu
3. Fournissez des maquettes ou des exemples si applicable
4. Discutez de l'approche d'implémentation
5. Obtenez des retours avant d'implémenter

### Processus de Pull Request

#### 1. Fork & Clone
```bash
# Fork sur GitHub, puis clonez votre fork
git clone https://github.com/YOUR_USERNAME/oracle-monitor-dashboard.git
cd oracle-monitor-dashboard
```

#### 2. Créer une Branche
```bash
# Créer une branche feature depuis develop
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name

# Ou branche de correction
git checkout -b fix/issue-description
```

#### 3. Effectuer les Modifications
- Suivez les standards de codage (voir ci-dessous)
- Écrivez des tests pour les nouvelles fonctionnalités
- Mettez à jour la documentation si nécessaire
- Gardez les commits focalisés et atomiques

#### 4. Tester en Local
```bash
# Exécuter tous les tests
make ci-test

# Exécuter le linting
make ci-lint

# Compiler pour vérifier l'absence d'erreurs
make dev-build
```

#### 5. Commit
```bash
# Préparer les changements
git add .

# Commit avec message conventionnel
git commit -m "feat(api): add SQL monitor detail endpoint

- Add detail view with execution plan
- Include parallelism information
- Update API documentation

Closes #123"
```

#### 6. Push & Créer une PR
```bash
git push origin feature/your-feature-name
# Créer une Pull Request sur GitHub
```

### Exigences de la PR

| Exigence | Description |
|----------|-------------|
| ✅ Tests passent | Toutes les vérifications CI sont vertes |
| ✅ Linting passe | `make ci-lint` passe |
| ✅ Documentation mise à jour | README, docs API, etc. |
| ✅ Entrée dans le Changelog | Ajoutée dans CHANGELOG.md |
| ✅ Responsabilité unique | Une fonctionnalité/correction par PR |
| ✅ Titre descriptif | Titre de PR clair et concis |
| ✅ Ticket lié | Référence au ticket associé |

---

## Standards de Codage

### Python (Backend)

#### Guide de Style
- **Formatteur :** Ruff (configuré dans `pyproject.toml`)
- **Longueur de ligne :** 100 caractères
- **Guillemets :** Guillemets doubles
- **Imports :** Triés (isort via Ruff)

#### Indications de Type
```python
# Requis pour toutes les fonctions
async def get_data(param: str, limit: int = 10) -> list[dict[str, Any]]:
    ...

# Utiliser TypeAlias pour les types complexes
from typing import TypeAlias
QueryResult: TypeAlias = list[dict[str, Any]]
```

#### Docstrings (Style Google)
```python
async def get_tablespaces() -> list[TablespaceInfo]:
    """Retrieve all tablespaces with usage statistics.
    
    Returns:
        List of tablespace info dictionaries.
        
    Raises:
        DatabaseConnectionError: If Oracle connection fails.
    """
```

#### Gestion des Erreurs
```python
# Utiliser des exceptions personnalisées
from app.core.exceptions import DatabaseConnectionError, NotFoundError

async def get_tablespace(name: str) -> TablespaceDetail:
    result = await oracle_pool.execute_query(QUERY, {"name": name})
    if not result:
        raise NotFoundError(f"Tablespace {name} not found")
    return result[0]
```

#### Motifs Asynchrones
```python
# Toujours utiliser async pour les I/O
async with oracle_pool.acquire() as conn:
    async with conn.cursor() as cursor:
        await cursor.execute(query, params)
        return await cursor.fetchall()

# Utiliser un pool de connexions, pas des connexions directes
```

### TypeScript (Frontend)

#### Guide de Style
- **Formatteur :** Prettier (configuré dans `.prettierrc`)
- **Linter :** ESLint avec TypeScript ESLint
- **Mode strict :** Activé dans `tsconfig.json`

#### Types
```typescript
// Utiliser des interfaces pour les formes d'objets
interface SessionInfo {
  sid: number;
  serial: number;
  username: string | null;
  // ...
}

// Utiliser type pour les unions, primitives
type Severity = 'CRITICAL' | 'WARNING' | 'INFO';

// Imports de type uniquement
import type { SessionInfo } from '../types/api';
```

#### Composants
```tsx
// Composants fonctionnels avec interface de props explicite
interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: number;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
}

export const KPICard: React.FC<KPICardProps> = ({ 
  title, 
  value, 
  unit = '', 
  trend,
  color = 'primary' 
}) => {
  // ...
};
```

#### Hooks
```typescript
// Hooks personnalisés pour la récupération de données
export function useSessions(filters?: SessionFilters) {
  return useQuery({
    queryKey: ['sessions', filters],
    queryFn: () => apiClient.get<SessionInfo[]>('/sessions', { params: filters }),
    staleTime: 15000,
  });
}
```

#### Gestion de l'État
- **État serveur :** TanStack Query (useQuery, useMutation)
- **État client :** React useState, useReducer
- **État global :** React Context (Auth, Connection)
- **Pas de Redux** - pas nécessaire pour la taille de cette application

### Messages de Commit Git

Suivez [Conventional Commits](https://www.conventionalcommits.org/) :

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types :**
| Type | Description |
|------|-------------|
| `feat` | Nouvelle fonctionnalité |
| `fix` | Correction de bug |
| `docs` | Documentation uniquement |
| `style` | Formatage, pas de changement de code |
| `refactor` | Restructuration du code |
| `perf` | Amélioration de performance |
| `test` | Ajout de tests |
| `build` | Changements du système de build |
| `ci` | Configuration CI |
| `chore` | Maintenance |

**Scopes :** `api`, `frontend`, `backend`, `docs`, `deploy`, `config`, `charts`, `components`

**Exemples :**
```
feat(api): add AWR compare period endpoint
fix(frontend): resolve blocking tree rendering issue
docs(api): update SQL monitor API documentation
refactor(backend): extract Oracle queries to separate module
test(integration): add SQL monitor integration tests
chore(deps): update Recharts to v2.12
```

---

## Standards de Test

### Tests Backend

```python
# Tests unitaires - tester les fonctions individuelles
def test_format_bytes():
    assert format_bytes(1024) == "1.00 KB"

# Tests d'intégration - tester les endpoints API
@pytest.mark.asyncio
async def test_overview_endpoint(client: AsyncClient, auth_headers):
    response = await client.get("/api/v1/overview", headers=auth_headers)
    assert response.status_code == 200
    assert "database" in response.json()

# Fixtures dans conftest.py
@pytest.fixture
async def client() -> AsyncClient:
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
```

### Tests Frontend

```typescript
// Tests unitaires - React Testing Library
import { render, screen } from '@testing-library/react';
import { KPICard } from './KPICard';

test('renders title and value', () => {
  render(<KPICard title="Test" value={100} unit="%" />);
  expect(screen.getByText('Test')).toBeInTheDocument();
  expect(screen.getByText('100%')).toBeInTheDocument();
});

// Tests E2E - Playwright
test('dashboard loads and shows KPI cards', async ({ page }) => {
  await page.goto('/');
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await expect(page.locator('text=Dashboard Overview')).toBeVisible();
});
```

### Objectifs de Couverture de Test

| Couche | Objectif |
|--------|----------|
| Tests unitaires | >80% |
| Tests d'intégration | >60% |
| Tests E2E | Chemins critiques |

---

## Standards de Documentation

### Fichiers de Documentation

| Fichier | Objectif |
|---------|----------|
| `README.md` | Vue d'ensemble du projet, démarrage rapide |
| `ARCHITECTURE.md` | Conception du système |
| `BACKEND_API.md` | Référence API |
| `ORACLE_QUERIES.md` | Référence des requêtes SQL |
| `FRONTEND_COMPONENTS.md` | Catalogue des composants |
| `DEPLOYMENT.md` | Guide de déploiement |
| `CONFIGURATION.md` | Référence de configuration |
| `DEVELOPMENT.md` | Flux de travail de développement |
| `FEATURES.md` | Documentation fonctionnelle |
| `TROUBLESHOOTING.md` | Problèmes courants |
| `CONTRIBUTING.md` | Ce fichier |

### Style de Documentation

- **Titres clairs** - Utilisez ##, ### de manière appropriée
- **Blocs de code** - Spécifiez le langage
- **Tableaux** - Pour les données structurées
- **Liens** - Chemins relatifs pour la documentation interne
- **Restez à jour** - Mettez à jour la documentation avec les changements de code

---

## Processus de Révision

### Checklist de Révision de Code

**Vérifications du réviseur :**
- [ ] Le code suit les guides de style
- [ ] Tests ajoutés/mis à jour
- [ ] Documentation mise à jour
- [ ] Pas de problèmes de sécurité
- [ ] Performance acceptable
- [ ] Gestion des erreurs complète
- [ ] Journalisation appropriée
- [ ] Types corrects

**Responsabilités de l'auteur :**
- [ ] Auto-révision avant de demander une révision
- [ ] Répondre aux retours rapidement
- [ ] Traiter tous les commentaires
- [ ] Maintenir la PR à jour avec la branche de base

### Délai de Révision

- **Révision initiale :** Dans les 2 jours ouvrés
- **Suivi :** Dans le jour ouvré
- **Approbation :** 1 réviseur minimum
- **Fusion :** Après le passage de toutes les vérifications

---

## Processus de Publication

### Versionnage

Suivez le [Semantic Versioning](https://semver.org/) :

```
MAJOR.MINOR.PATCH

MAJOR - Changements incompatibles
MINOR - Nouvelles fonctionnalités (rétrocompatible)
PATCH - Corrections de bugs (rétrocompatible)
```

### Checklist de Publication

1. Mettre à jour `CHANGELOG.md`
2. Mettre à jour la version dans `pyproject.toml` et `package.json`
3. Créer la branche de release : `release/v1.2.0`
4. Exécuter la suite complète de tests
5. Construire les images de production
6. Créer la release GitHub avec les notes
7. Déployer en staging
8. Déployer en production
9. Fusionner dans `main` et `develop`

---

## Environnement de Développement

### Outils Recommandés

| Outil | Objectif |
|-------|----------|
| VS Code | Éditeur principal |
| Docker Desktop | Gestion des conteneurs |
| TablePlus/DBeaver | GUI Oracle |
| Postman/Insomnia | Tests API |
| React DevTools | Débogage frontend |
| RedisInsight | Monitoring Redis |

### Extensions VS Code

```json
{
  "recommendations": [
    "ms-python.python",
    "ms-python.vscode-pylance",
    "charliermarsh.ruff",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-azuretools.vscode-docker",
    "github.vscode-github-actions"
  ]
}
```

---

## Sécurité

### Signaler des Problèmes de Sécurité

**NE CRÉEZ PAS** de tickets publics pour les vulnérabilités de sécurité.

Envoyez plutôt un email à : `security@your-domain.com`

Incluez :
- Description de la vulnérabilité
- Étapes pour reproduire
- Impact potentiel
- Correction suggérée (le cas échéant)

### Bonnes Pratiques de Sécurité

- Ne committez jamais de secrets (utilisez `.env` et des gestionnaires de secrets)
- Validez toutes les entrées
- Utilisez des requêtes paramétrées
- Implémentez une limitation de débit
- Maintenez les dépendances à jour
- Exécutez `npm audit` et `uv pip audit` régulièrement

---

## Communauté

### Canaux de Communication

- **GitHub Issues** - Rapports de bugs, demandes de fonctionnalités
- **GitHub Discussions** - Questions, idées
- **Discord/Slack** - Chat en temps réel (si disponible)

### Reconnaissance

Les contributeurs sont reconnus dans :
- Le fichier `CONTRIBUTORS.md`
- Les notes de version
- La page des contributeurs GitHub

---

## Licence

En contribuant, vous acceptez que vos contributions soient licenciées sous la licence du projet (MIT License).

---

## Des Questions ?

- Consultez la documentation existante
- Recherchez dans GitHub Issues
- Posez des questions dans GitHub Discussions
- Mentionnez les mainteneurs dans les PR

Merci de contribuer ! 🎉
