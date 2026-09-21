"""Budget endpoints (Supabase-backed)."""

from uuid import UUID

from ai.services import budget_ai
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field

from app.core.security import AuthUser
from app.dependencies.auth import get_current_user
from app.repositories.supabase_client import Repository
from app.services.document_service import _requirements_chat_context, persist_budget_estimate_rows
from app.services.project_service import project_service

router = APIRouter()
budgets_repo = Repository("project_budgets")
prefs_repo = Repository("development_preferences")


@router.get("/project/{project_id}")
async def list_project_budgets(project_id: UUID, user: AuthUser = Depends(get_current_user)):
    project_service.get_project(project_id, user)
    rows = budgets_repo.list(filters={"project_id": str(project_id)}, limit=100)
    return rows


class BudgetEstimateRequest(BaseModel):
    project_id: UUID
    context: str = ""
    client_budget: float | None = None


@router.post("/estimate", status_code=status.HTTP_201_CREATED)
async def estimate_budget(body: BudgetEstimateRequest, user: AuthUser = Depends(get_current_user)):
    project = project_service.get_project(body.project_id, user)
    chat_context = _requirements_chat_context(str(body.project_id))
    content = body.context or "\n".join(
        part
        for part in (
            project.get("title") or "",
            project.get("description") or "",
            chat_context,
        )
        if part
    )
    if body.client_budget:
        content += f"\nClient estimated budget: {body.client_budget}"
    estimate = budget_ai.generate(content)
    rows = persist_budget_estimate_rows(str(body.project_id), estimate, client_budget=body.client_budget)
    return {"budgets": rows, "estimate": estimate.model_dump()}


class PreferenceRequest(BaseModel):
    project_id: UUID
    development_model: str = Field(..., pattern="^(individual|team|enterprise)$")
    notes: str | None = None


@router.post("/preference", status_code=status.HTTP_201_CREATED)
async def set_preference(body: PreferenceRequest, user: AuthUser = Depends(get_current_user)):
    from datetime import datetime, timezone

    from app.repositories.supabase_client import projects_repo

    project_service.get_project(body.project_id, user)
    existing = prefs_repo.list(filters={"project_id": str(body.project_id)}, limit=1)
    payload = {
        "project_id": str(body.project_id),
        "preferred_model": body.development_model,
        "notes": body.notes,
        "selected_at": datetime.now(timezone.utc).isoformat(),
    }
    if existing:
        row = prefs_repo.update(existing[0]["id"], payload) or existing[0]
    else:
        row = prefs_repo.insert(payload)
    projects_repo.update(body.project_id, {"development_model": body.development_model})
    return row
