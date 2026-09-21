"""Requirement endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import AuthUser
from app.dependencies.auth import get_current_user
from app.repositories.supabase_client import requirements_repo
from app.schemas.requirements import RequirementCreate, RequirementResponse, RequirementUpdate
from app.services.audit_service import audit_service
from app.services.project_service import project_service

router = APIRouter()


@router.get("/project/{project_id}", response_model=list[RequirementResponse])
async def list_requirements(project_id: UUID, user: AuthUser = Depends(get_current_user)):
    project_service.get_project(project_id, user)
    rows = requirements_repo.list(filters={"project_id": str(project_id)}, limit=100)
    return [RequirementResponse.model_validate(r) for r in rows]


@router.post("/project/{project_id}", response_model=RequirementResponse, status_code=status.HTTP_201_CREATED)
async def create_requirement(
    project_id: UUID,
    body: RequirementCreate,
    user: AuthUser = Depends(get_current_user),
):
    project_service.get_project(project_id, user)
    row = requirements_repo.insert(
        {
            "project_id": str(project_id),
            "title": body.title,
            "requirement_type": body.requirement_type,
            "content": body.content,
            "priority": body.priority,
            "status": "draft",
            "source": "client",
            "current_version": 1,
        }
    )
    audit_service.log(
        actor_id=user.id,
        action="requirement.create",
        entity_type="requirement",
        entity_id=row["id"],
        project_id=project_id,
        new_values=row,
    )
    return RequirementResponse.model_validate(row)


@router.patch("/{requirement_id}", response_model=RequirementResponse)
async def update_requirement(
    requirement_id: UUID,
    body: RequirementUpdate,
    user: AuthUser = Depends(get_current_user),
):
    row = requirements_repo.get(requirement_id)
    if not row:
        raise HTTPException(status_code=404, detail="Requirement not found")
    project_service.get_project(UUID(str(row["project_id"])), user)
    updated = requirements_repo.update(requirement_id, body.model_dump(exclude_unset=True))
    return RequirementResponse.model_validate(updated or row)
