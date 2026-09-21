"""Project endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.core.security import AuthUser
from app.core.state_machine import InvalidTransitionError
from app.dependencies.auth import get_current_user
from app.repositories.supabase_client import freelancer_profiles_repo, profiles_repo
from app.schemas.projects import (
    ProjectCreate,
    ProjectResponse,
    ProjectTransitionRequest,
    ProjectTransitionResponse,
    ProjectUpdate,
)
from app.services.project_service import ProjectAccessError, ProjectDeleteError, project_service

router = APIRouter()


def _freelancer_display_name(assigned_id: str | None) -> str | None:
    if not assigned_id:
        return None
    profile = profiles_repo.get(assigned_id)
    if profile and profile.get("full_name"):
        return str(profile["full_name"])
    fp = freelancer_profiles_repo.get(assigned_id)
    if fp:
        user = profiles_repo.get(fp.get("user_id")) or {}
        return str(user.get("full_name") or fp.get("headline") or "Freelancer")
    rows = freelancer_profiles_repo.list(filters={"user_id": assigned_id}, limit=1)
    if rows:
        user = profiles_repo.get(rows[0].get("user_id")) or profile or {}
        return str(user.get("full_name") or rows[0].get("headline") or "Freelancer")
    if profile:
        return str(profile.get("email") or "Freelancer")
    return None


def enrich_project_row(row: dict) -> dict:
    assigned = str(row["assigned_freelancer_id"]) if row.get("assigned_freelancer_id") else None
    return {
        **row,
        "assigned_freelancer_name": _freelancer_display_name(assigned),
    }


def _to_response(row: dict) -> ProjectResponse:
    enriched = enrich_project_row(row)
    return ProjectResponse.model_validate(
        {
            **enriched,
            "id": enriched["id"],
            "client_id": enriched["client_id"],
        }
    )


@router.get("", response_model=list[ProjectResponse])
async def list_projects(user: AuthUser = Depends(get_current_user)):
    rows = project_service.list_projects(user)
    return [_to_response(r) for r in rows]


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(body: ProjectCreate, user: AuthUser = Depends(get_current_user)):
    row = project_service.create_project(user, body.model_dump())
    return _to_response(row)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: UUID, user: AuthUser = Depends(get_current_user)):
    try:
        row = project_service.get_project(project_id, user)
    except LookupError:
        raise HTTPException(status_code=404, detail="Project not found")
    except ProjectAccessError:
        raise HTTPException(status_code=403, detail="Access denied")
    return _to_response(row)


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: UUID, body: ProjectUpdate, user: AuthUser = Depends(get_current_user)):
    try:
        row = project_service.update_project(project_id, user, body.model_dump(exclude_unset=True))
    except LookupError:
        raise HTTPException(status_code=404, detail="Project not found")
    except ProjectAccessError:
        raise HTTPException(status_code=403, detail="Access denied")
    return _to_response(row)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(project_id: UUID, user: AuthUser = Depends(get_current_user)):
    try:
        project_service.delete_project(project_id, user)
    except LookupError:
        raise HTTPException(status_code=404, detail="Project not found")
    except ProjectAccessError:
        raise HTTPException(status_code=403, detail="Access denied")
    except ProjectDeleteError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{project_id}/transition", response_model=ProjectTransitionResponse)
async def transition_project(
    project_id: UUID,
    body: ProjectTransitionRequest,
    user: AuthUser = Depends(get_current_user),
):
    try:
        result = project_service.transition(project_id, user, body.target_state, body.reason)
    except LookupError:
        raise HTTPException(status_code=404, detail="Project not found")
    except ProjectAccessError:
        raise HTTPException(status_code=403, detail="Access denied")
    except InvalidTransitionError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return ProjectTransitionResponse(project_id=project_id, **result.model_dump())
