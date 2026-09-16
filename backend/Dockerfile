FROM python:3.11-slim AS base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN pip install --no-cache-dir uv==0.4.0

FROM base AS development

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --all-extras

COPY . .
EXPOSE 8000

CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

FROM base AS builder

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-editable

COPY . .
RUN .venv/bin/python -m compileall -q app/

FROM python:3.11-slim AS production

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --shell /bin/bash appuser

WORKDIR /app

# Install production dependencies directly using pip
COPY pyproject.toml ./
RUN pip install --no-cache-dir --no-binary=uvicorn \
    fastapi==0.141.1 \
    uvicorn==0.53.0 \
    oracledb==26.0.0 \
    redis==8.1.0 \
    celery==5.6.3 \
    pydantic==2.13.5 \
    pydantic-settings==2.15.0 \
    python-jose[cryptography]==3.5.0 \
    passlib[bcrypt]==1.7.4 \
    python-multipart==0.0.32 \
    pyyaml==6.0.3 \
    alembic==1.20.0 \
    structlog==26.1.0 \
    tenacity==9.1.4 \
    pandas==3.0.5 \
    numpy==2.4.6 \
    openpyxl==3.1.5 \
    reportlab==5.0.1 \
    jinja2==3.1.6 \
    httpx==0.28.1 \
    prometheus-client==0.26.0 \
    prometheus-fastapi-instrumentator==8.1.0 \
    && useradd --create-home --shell /bin/bash appuser

WORKDIR /app

COPY --from=builder --chown=appuser:appuser /app/app ./app
COPY --from=builder --chown=appuser:appuser /app/alembic.ini ./alembic.ini
COPY --from=builder --chown=appuser:appuser /app/alembic ./alembic

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Verify uvicorn is installed and test it
RUN python -c "import uvicorn; print('uvicorn version:', uvicorn.__version__); import sys; print('Python executable:', sys.executable); import subprocess; result = subprocess.run([sys.executable, '-m', 'uvicorn', '--help'], capture_output=True, text=True); print('uvicorn --help works:', result.returncode == 0); print('stdout:', result.stdout[:200])"

# Copy entrypoint script
COPY --chown=appuser:appuser entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]