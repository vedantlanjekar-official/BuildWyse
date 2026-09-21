"""Client-specific endpoints."""

from fastapi import APIRouter, Depends

from app.api.v1.projects import enrich_project_row
from app.core.security import AuthUser, Role
from app.dependencies.auth import get_current_user, require_roles
from app.repositories.supabase_client import profiles_repo, projects_repo

router = APIRouter()


@router.get("/dashboard")
async def client_dashboard(user: AuthUser = Depends(require_roles(Role.CLIENT))):
    projects = projects_repo.list(limit=200)
    my_projects = [enrich_project_row(p) for p in projects if str(p.get("client_id")) == user.id]
    return {
        "client_id": user.id,
        "project_count": len(my_projects),
        "projects": my_projects[:20],
    }


@router.get("")
async def list_clients(user: AuthUser = Depends(get_current_user)):
    if not user.is_admin:
        return [profiles_repo.get(user.id)]
    rows = profiles_repo.list(limit=200)
    return [r for r in rows if r.get("account_type") == "client"]
