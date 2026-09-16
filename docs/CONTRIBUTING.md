> **Language:** English · [Version française](fr/CONTRIBUTING.md)

# Contributing Guidelines

## Welcome

Thank you for your interest in contributing to the Oracle Monitor Dashboard! This document provides guidelines for contributing to the project.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Accept criticism gracefully
- Prioritize the project's best interests

## How to Contribute

### Reporting Issues

Before creating an issue, please:

1. **Search existing issues** - Avoid duplicates
2. **Use the issue template** - Provide all requested information
3. **Be specific** - Include steps to reproduce, expected vs actual behavior
4. **Include environment** - OS, Docker version, Oracle version, error logs

**Issue Types:**
- 🐛 **Bug** - Something doesn't work as expected
- ✨ **Feature Request** - New functionality
- 📚 **Documentation** - Improvements to docs
- 🔧 **Refactor** - Code improvements
- ❓ **Question** - Usage help

### Suggesting Features

1. Open a **Feature Request** issue
2. Describe the use case and problem it solves
3. Provide mockups or examples if applicable
4. Discuss implementation approach
5. Get feedback before implementing

### Pull Request Process

#### 1. Fork & Clone
```bash
# Fork on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/oracle-monitor-dashboard.git
cd oracle-monitor-dashboard
```

#### 2. Create Branch
```bash
# Create feature branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name

# Or bugfix branch
git checkout -b fix/issue-description
```

#### 3. Make Changes
- Follow coding standards (see below)
- Write tests for new functionality
- Update documentation as needed
- Keep commits focused and atomic

#### 4. Test Locally
```bash
# Run all tests
make ci-test

# Run linting
make ci-lint

# Build to verify no errors
make dev-build
```

#### 5. Commit
```bash
# Stage changes
git add .

# Commit with conventional message
git commit -m "feat(api): add SQL monitor detail endpoint

- Add detail view with execution plan
- Include parallelism information
- Update API documentation

Closes #123"
```

#### 6. Push & Create PR
```bash
git push origin feature/your-feature-name
# Create Pull Request on GitHub
```

### PR Requirements

| Requirement | Description |
|-------------|-------------|
| ✅ Tests pass | All CI checks green |
| ✅ Linting passes | `make ci-lint` passes |
| ✅ Documentation updated | README, API docs, etc. |
| ✅ Changelog entry | Added to CHANGELOG.md |
| ✅ Single responsibility | One feature/fix per PR |
| ✅ Descriptive title | Clear, concise PR title |
| ✅ Linked issue | References related issue |

---

## Coding Standards

### Python (Backend)

#### Style Guide
- **Formatter:** Ruff (configured in `pyproject.toml`)
- **Line length:** 100 characters
- **Quotes:** Double quotes
- **Imports:** Sorted (isort via Ruff)

#### Type Hints
```python
# Required for all functions
async def get_data(param: str, limit: int = 10) -> list[dict[str, Any]]:
    ...

# Use TypeAlias for complex types
from typing import TypeAlias
QueryResult: TypeAlias = list[dict[str, Any]]
```

#### Docstrings (Google Style)
```python
async def get_tablespaces() -> list[TablespaceInfo]:
    """Retrieve all tablespaces with usage statistics.
    
    Returns:
        List of tablespace info dictionaries.
        
    Raises:
        DatabaseConnectionError: If Oracle connection fails.
    """
```

#### Error Handling
```python
# Use custom exceptions
from app.core.exceptions import DatabaseConnectionError, NotFoundError

async def get_tablespace(name: str) -> TablespaceDetail:
    result = await oracle_pool.execute_query(QUERY, {"name": name})
    if not result:
        raise NotFoundError(f"Tablespace {name} not found")
    return result[0]
```

#### Async Patterns
```python
# Always use async for I/O
async with oracle_pool.acquire() as conn:
    async with conn.cursor() as cursor:
        await cursor.execute(query, params)
        return await cursor.fetchall()

# Use connection pool, not direct connections
```

### TypeScript (Frontend)

#### Style Guide
- **Formatter:** Prettier (configured in `.prettierrc`)
- **Linter:** ESLint with TypeScript ESLint
- **Strict mode:** Enabled in `tsconfig.json`

#### Types
```typescript
// Use interfaces for object shapes
interface SessionInfo {
  sid: number;
  serial: number;
  username: string | null;
  // ...
}

// Use type for unions, primitives
type Severity = 'CRITICAL' | 'WARNING' | 'INFO';

// Type-only imports
import type { SessionInfo } from '../types/api';
```

#### Components
```tsx
// Functional components with explicit props interface
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
// Custom hooks for data fetching
export function useSessions(filters?: SessionFilters) {
  return useQuery({
    queryKey: ['sessions', filters],
    queryFn: () => apiClient.get<SessionInfo[]>('/sessions', { params: filters }),
    staleTime: 15000,
  });
}
```

#### State Management
- **Server state:** TanStack Query (useQuery, useMutation)
- **Client state:** React useState, useReducer
- **Global state:** React Context (Auth, Connection)
- **No Redux** - not needed for this app size

### Git Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `refactor` | Code restructure |
| `perf` | Performance improvement |
| `test` | Adding tests |
| `build` | Build system changes |
| `ci` | CI configuration |
| `chore` | Maintenance |

**Scopes:** `api`, `frontend`, `backend`, `docs`, `deploy`, `config`, `charts`, `components`

**Examples:**
```
feat(api): add AWR compare period endpoint
fix(frontend): resolve blocking tree rendering issue
docs(api): update SQL monitor API documentation
refactor(backend): extract Oracle queries to separate module
test(integration): add SQL monitor integration tests
chore(deps): update Recharts to v2.12
```

---

## Testing Standards

### Backend Tests

```python
# Unit tests - test individual functions
def test_format_bytes():
    assert format_bytes(1024) == "1.00 KB"

# Integration tests - test API endpoints
@pytest.mark.asyncio
async def test_overview_endpoint(client: AsyncClient, auth_headers):
    response = await client.get("/api/v1/overview", headers=auth_headers)
    assert response.status_code == 200
    assert "database" in response.json()

# Fixtures in conftest.py
@pytest.fixture
async def client() -> AsyncClient:
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
```

### Frontend Tests

```typescript
// Unit tests - React Testing Library
import { render, screen } from '@testing-library/react';
import { KPICard } from './KPICard';

test('renders title and value', () => {
  render(<KPICard title="Test" value={100} unit="%" />);
  expect(screen.getByText('Test')).toBeInTheDocument();
  expect(screen.getByText('100%')).toBeInTheDocument();
});

// E2E tests - Playwright
test('dashboard loads and shows KPI cards', async ({ page }) => {
  await page.goto('/');
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await expect(page.locator('text=Dashboard Overview')).toBeVisible();
});
```

### Test Coverage Goals

| Layer | Target |
|-------|--------|
| Unit tests | >80% |
| Integration tests | >60% |
| E2E tests | Critical paths |

---

## Documentation Standards

### Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | Project overview, quick start |
| `ARCHITECTURE.md` | System design |
| `BACKEND_API.md` | API reference |
| `ORACLE_QUERIES.md` | SQL queries reference |
| `FRONTEND_COMPONENTS.md` | Component catalog |
| `DEPLOYMENT.md` | Deployment guide |
| `CONFIGURATION.md` | Configuration reference |
| `DEVELOPMENT.md` | Development workflow |
| `FEATURES.md` | Functional documentation |
| `TROUBLESHOOTING.md` | Common issues |
| `CONTRIBUTING.md` | This file |

### Documentation Style

- **Clear headings** - Use ##, ### appropriately
- **Code blocks** - Specify language
- **Tables** - For structured data
- **Links** - Relative paths for internal docs
- **Keep updated** - Update docs with code changes

---

## Review Process

### Code Review Checklist

**Reviewer checks:**
- [ ] Code follows style guides
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No security issues
- [ ] Performance acceptable
- [ ] Error handling complete
- [ ] Logging appropriate
- [ ] Types correct

**Author responsibilities:**
- [ ] Self-review before requesting review
- [ ] Respond to feedback promptly
- [ ] Address all comments
- [ ] Keep PR updated with base branch

### Review Timeline

- **Initial review:** Within 2 business days
- **Follow-up:** Within 1 business day
- **Approval:** 1 reviewer minimum
- **Merge:** After all checks pass

---

## Release Process

### Versioning

Follow [Semantic Versioning](https://semver.org/):

```
MAJOR.MINOR.PATCH

MAJOR - Breaking changes
MINOR - New features (backward compatible)
PATCH - Bug fixes (backward compatible)
```

### Release Checklist

1. Update `CHANGELOG.md`
2. Update version in `pyproject.toml` and `package.json`
3. Create release branch: `release/v1.2.0`
4. Run full test suite
5. Build production images
6. Create GitHub release with notes
7. Deploy to staging
8. Deploy to production
9. Merge to `main` and `develop`

---

## Development Environment

### Recommended Tools

| Tool | Purpose |
|------|---------|
| VS Code | Primary editor |
| Docker Desktop | Container management |
| TablePlus/DBeaver | Oracle GUI |
| Postman/Insomnia | API testing |
| React DevTools | Frontend debugging |
| RedisInsight | Redis monitoring |

### VS Code Extensions

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

## Security

### Reporting Security Issues

**DO NOT** create public issues for security vulnerabilities.

Instead, email: `security@your-domain.com`

Include:
- Description of vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Security Best Practices

- Never commit secrets (use `.env` and secret managers)
- Validate all inputs
- Use parameterized queries
- Implement rate limiting
- Keep dependencies updated
- Run `npm audit` and `uv pip audit` regularly

---

## Community

### Communication Channels

- **GitHub Issues** - Bug reports, feature requests
- **GitHub Discussions** - Questions, ideas
- **Discord/Slack** - Real-time chat (if available)

### Recognition

Contributors are recognized in:
- `CONTRIBUTORS.md` file
- Release notes
- GitHub contributors page

---

## License

By contributing, you agree that your contributions will be licensed under the project's license (MIT License).

---

## Questions?

- Check existing documentation
- Search GitHub Issues
- Ask in GitHub Discussions
- Tag maintainers in PRs

Thank you for contributing! 🎉