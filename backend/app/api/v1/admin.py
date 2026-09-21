"""Admin list and oversight endpoints."""

from fastapi import APIRouter, Depends

from app.core.security import AuthUser
from app.dependencies.auth import require_admin
from app.repositories.supabase_client import (
    audit_logs_repo,
    certificates_repo,
    payment_orders_repo,
    profiles_repo,
    projects_repo,
    is_memory_mode,
)

router = APIRouter()


@router.get("/overview")
async def admin_overview(user: AuthUser = Depends(require_admin)):
    return {
        "memory_mode": is_memory_mode(),
        "counts": {
            "profiles": len(profiles_repo.list(limit=1000)),
            "projects": len(projects_repo.list(limit=1000)),
            "payment_orders": len(payment_orders_repo.list(limit=1000)),
            "certificates": len(certificates_repo.list(limit=1000)),
            "audit_logs": len(audit_logs_repo.list(limit=1000)),
        },
    }


@router.get("/projects")
async def admin_list_projects(user: AuthUser = Depends(require_admin)):
    return projects_repo.list(limit=200)


@router.get("/users")
async def admin_list_users(user: AuthUser = Depends(require_admin)):
    return profiles_repo.list(limit=200)


@router.get("/audit-logs")
async def admin_audit_logs(user: AuthUser = Depends(require_admin)):
    return audit_logs_repo.list(limit=200)


@router.get("/payments")
async def admin_payments(user: AuthUser = Depends(require_admin)):
    return payment_orders_repo.list(limit=200)
