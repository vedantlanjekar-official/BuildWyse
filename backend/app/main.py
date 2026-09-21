"""BuildWyse FastAPI application entry point."""

from __future__ import annotations

import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

# Ensure repo root is on path for ai/ and integrations/ packages
ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv

# Load root + backend .env into os.environ (file wins over stale shell env)
load_dotenv(ROOT / ".env", override=True)
load_dotenv(ROOT / "backend" / ".env", override=True)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.middleware.audit import AuditContextMiddleware
from app.middleware.rate_limit import RateLimitMiddleware
from app.repositories.supabase_client import get_supabase, is_memory_mode


@asynccontextmanager
async def lifespan(app: FastAPI):
    get_settings.cache_clear()
    settings = get_settings()
    # Mirror settings into os.environ so ai/ services see live keys
    if settings.openai_api_key and not os.getenv("OPENAI_API_KEY"):
        os.environ["OPENAI_API_KEY"] = settings.openai_api_key
    os.environ["AI_MODE"] = settings.ai_mode
    get_supabase()
    app.state.memory_mode = is_memory_mode()
    app.state.settings = settings
    yield


def create_app() -> FastAPI:
    get_settings.cache_clear()
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        description="BuildWyse — AI-powered project execution platform API",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_origin_regex=r"https://([a-z0-9-]+\.)*(vercel\.app|onrender\.com)",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(AuditContextMiddleware)
    app.add_middleware(RateLimitMiddleware)

    @app.get("/health", tags=["health"])
    async def health_check():
        s = get_settings()
        return {
            "status": "ok",
            "service": "buildwyse-api",
            "memory_mode": is_memory_mode(),
            "supabase_configured": s.supabase_configured,
            "using_service_role": s.using_service_role,
            "ai_mode": s.ai_mode,
            "openai_live": s.openai_live,
            "email_mode": s.email_mode,
            "email_configured": s.email_configured,
        }

    app.include_router(api_router)
    return app


app = create_app()
