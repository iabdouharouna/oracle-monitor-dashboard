# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Complete Oracle Monitor Dashboard MVP
- 10 functional modules (Dashboard, Instance Viewer, Performance Hub, SQL Monitor, Sessions, Storage, Memory, Wait Events, Alerts, Reports)
- Full-stack architecture: FastAPI + React + TypeScript
- 38 Oracle V$ queries for comprehensive monitoring
- Real-time WebSocket updates
- JWT authentication with role-based access (DBA/View)
- Docker Compose deployment with Oracle 23c Free
- Prometheus + Grafana monitoring
- Comprehensive documentation (10 docs)
- CI/CD pipeline with GitHub Actions

### Changed
- N/A

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- JWT authentication with bcrypt password hashing
- Parameterized Oracle queries (no SQL injection)
- CORS configuration
- Role-based access control

## [1.0.0] - 2024-01-15

### Added
- Initial release of Oracle Monitor Dashboard
- All 10 monitoring modules
- Docker Compose development and production stacks
- Complete documentation suite
- CI/CD pipeline with GitHub Actions

---

## Release Notes Template

### [VERSION] - YYYY-MM-DD

#### Added
- New features

#### Changed
- Changes to existing functionality

#### Deprecated
- Soon-to-be removed features

#### Removed
- Removed features

#### Fixed
- Bug fixes

#### Security
- Security improvements