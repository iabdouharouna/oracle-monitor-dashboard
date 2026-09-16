.PHONY: help up down build logs test lint format clean dev prod

DC = docker-compose
DC_DEV = docker-compose -f docker-compose.yml -f docker-compose.override.yml

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

dev: ## Start development environment
	$(DC_DEV) up -d

dev-down: ## Stop development environment
	$(DC_DEV) down

dev-logs: ## Show development logs
	$(DC_DEV) logs -f

dev-build: ## Build development images
	$(DC_DEV) build

prod: ## Start production
	$(DC) up -d

prod-down: ## Stop production
	$(DC) down

prod-build: ## Build production images
	$(DC) build

db-shell: ## Open SQL*Plus shell
	docker exec -it oracle-monitor-db sqlplus monitor/monitor@FREE

db-logs: ## Oracle logs
	docker logs -f oracle-monitor-db

backend-shell: ## Backend shell
	docker exec -it oracle-monitor-backend bash

backend-logs: ## Backend logs
	docker logs -f oracle-monitor-backend

backend-test: ## Backend tests
	docker exec oracle-monitor-backend pytest -v

backend-lint: ## Backend lint
	docker exec oracle-monitor-backend ruff check .

backend-format: ## Backend format
	docker exec oracle-monitor-backend ruff format .

backend-migrate: ## Run migrations
	docker exec oracle-monitor-backend alembic upgrade head

backend-makemigrations: ## Create migration
	docker exec oracle-monitor-backend alembic revision --autogenerate -m "$(MSG)"

frontend-shell: ## Frontend shell
	docker exec -it oracle-monitor-frontend sh

frontend-logs: ## Frontend logs
	docker logs -f oracle-monitor-frontend

frontend-test: ## Frontend tests
	docker exec oracle-monitor-frontend npm run test

frontend-lint: ## Frontend lint
	docker exec oracle-monitor-frontend npm run lint

frontend-format: ## Frontend format
	docker exec oracle-monitor-frontend npm run format

frontend-build: ## Build frontend
	docker exec oracle-monitor-frontend npm run build

logs: ## All logs
	$(DC) logs -f

ps: ## Container status
	$(DC) ps

clean: ## Clean everything
	$(DC) down -v --remove-orphans
	docker system prune -f

reset: clean dev-build dev ## Full reset