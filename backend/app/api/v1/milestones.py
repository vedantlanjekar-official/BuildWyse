"""Milestone endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.core.security import AuthUser
from app.dependencies.auth import get_current_user
from app.repositories.supabase_client import milestones_repo, phases_repo
from app.schemas.phases import MilestoneCreate, MilestoneResponse
from app.services.project_service import project_service

router = APIRouter()


@router.get("/project/{project_id}", response_model=list[MilestoneResponse])
async def list_project_milestones(project_id: UUID, user: AuthUser = Depends(get_current_user)):
    project_service.get_project(project_id, user)
    rows = milestones_repo.list(filters={"project_id": str(project_id)}, limit=500)
    rows.sort(key=lambda r: r.get("sequence_number") or 0)
    return [MilestoneResponse.model_validate(r) for r in rows]


@router.get("/phase/{phase_id}", response_model=list[MilestoneResponse])
async def list_milestones(phase_id: UUID, user: AuthUser = Depends(get_current_user)):
    phase = phases_repo.get(phase_id)
    if phase:
        project_service.get_project(UUID(str(phase["project_id"])), user)
    rows = milestones_repo.list(filters={"phase_id": str(phase_id)}, limit=100)
    return [MilestoneResponse.model_validate(r) for r in rows]


@router.post("/phase/{phase_id}", response_model=MilestoneResponse, status_code=status.HTTP_201_CREATED)
async def create_milestone(phase_id: UUID, body: MilestoneCreate, user: AuthUser = Depends(get_current_user)):
    phase = phases_repo.get(phase_id)
    project_service.get_project(UUID(str(phase["project_id"])), user)
    row = milestones_repo.insert(
        {
            "phase_id": str(phase_id),
            "project_id": phase["project_id"],
            "title": body.title,
            "description": body.description,
            "due_date": body.due_date.isoformat() if body.due_date else None,
            "payment_amount": str(body.payment_amount) if body.payment_amount else None,
            "sequence_number": body.sequence_number,
            "status": "pending",
        }
    )
    return MilestoneResponse.model_validate(row)
