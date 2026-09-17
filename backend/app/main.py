import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import structlog

from app.config import settings
from app.lifespan import lifespan
from app.database import set_active_database
from app.api_metrics import api_metrics_buffer
from app.api.routes import auth, overview, instance, performance, sql_monitor
from app.api.routes import sessions, storage, memory, waits, alerts, exports, databases, metrics
from app.api import websocket
from app.core.exceptions import (
    OracleMonitorException,
    DatabaseConnectionError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ValidationError,
)

logger = structlog.get_logger(__name__)


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version="1.0.0",
        description="Oracle Database Monitoring Dashboard API",
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
        openapi_url=f"{settings.API_PREFIX}/openapi.json" if settings.DEBUG else None,
        lifespan=lifespan,
    )
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
        allow_methods=settings.CORS_ALLOW_METHODS,
        allow_headers=settings.CORS_ALLOW_HEADERS,
    )

    @app.middleware("http")
    async def active_database_middleware(request: Request, call_next):
        db_header = request.headers.get("X-Database")
        if db_header:
            set_active_database(db_header.strip())
        return await call_next(request)
    
    if settings.METRICS_ENABLED:
        @app.middleware("http")
        async def api_metrics_middleware(request: Request, call_next):
            start = time.time()
            response = await call_next(request)
            duration_ms = (time.time() - start) * 1000
            api_metrics_buffer.record(duration_ms, response.status_code)
            return response
    
    @app.exception_handler(OracleMonitorException)
    async def oracle_monitor_exception_handler(request: Request, exc: OracleMonitorException):
        logger.error("Application error", error=str(exc), path=request.url.path)
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.message, "code": exc.code},
        )
    
    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        logger.exception("Unhandled exception", path=request.url.path, error=str(exc))
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error", "code": "INTERNAL_ERROR"},
        )
    
    @app.get("/health", tags=["Health"])
    async def health_check():
        from app.database import oracle_pool
        from app.redis import redis_client
        from app.connections import get_catalog

        catalog = get_catalog()
        db_state = "not_configured"
        db_healthy = True
        if catalog:
            db_healthy = False
            try:
                await oracle_pool.execute_scalar("SELECT 1 FROM DUAL")
                db_healthy = True
                db_state = "connected"
            except Exception:
                db_state = "disconnected"

        redis_healthy = True
        try:
            redis_healthy = await redis_client.health_check()
        except Exception:
            redis_healthy = False

        status = "healthy" if db_healthy and redis_healthy else "degraded"

        return {
            "status": status,
            "database": db_state,
            "redis": "connected" if redis_healthy else "disconnected",
            "version": "1.0.0",
        }
    
    app.include_router(auth.router, prefix=f"{settings.API_PREFIX}/auth", tags=["Authentication"])
    app.include_router(overview.router, prefix=f"{settings.API_PREFIX}/overview", tags=["Overview"])
    app.include_router(instance.router, prefix=f"{settings.API_PREFIX}/instance", tags=["Instance Viewer"])
    app.include_router(performance.router, prefix=f"{settings.API_PREFIX}/performance", tags=["Performance Hub"])
    app.include_router(sql_monitor.router, prefix=f"{settings.API_PREFIX}/sql-monitor", tags=["SQL Monitor"])
    app.include_router(sessions.router, prefix=f"{settings.API_PREFIX}/sessions", tags=["Sessions"])
    app.include_router(storage.router, prefix=f"{settings.API_PREFIX}/storage", tags=["Storage"])
    app.include_router(memory.router, prefix=f"{settings.API_PREFIX}/memory", tags=["Memory"])
    app.include_router(waits.router, prefix=f"{settings.API_PREFIX}/waits", tags=["Wait Events"])
    app.include_router(alerts.router, prefix=f"{settings.API_PREFIX}/alerts", tags=["Alerts"])
    app.include_router(databases.router, prefix=f"{settings.API_PREFIX}/databases", tags=["Databases"])
    app.include_router(exports.router, prefix=f"{settings.API_PREFIX}/exports", tags=["Exports"])
    if settings.METRICS_ENABLED:
        app.include_router(metrics.router, prefix=f"{settings.API_PREFIX}/metrics", tags=["Metrics"])
    app.include_router(websocket.router, tags=["WebSocket"])
    
    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
    )