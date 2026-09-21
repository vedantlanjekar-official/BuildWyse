"""Task endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import AuthUser
from app.dependencies.auth import get_current_user
from app.repositories.supabase_client import phases_repo, tasks_repo
from app.schemas.phases import TaskCreate, TaskResponse
from app.services.project_service import project_service

router = APIRouter()


@router.get("/project/{project_id}", response_model=list[TaskResponse])
async def list_project_tasks(project_id: UUID, user: AuthUser = Depends(get_current_user)):
    project_service.get_project(project_id, user)
    rows = tasks_repo.list(filters={"project_id": str(project_id)}, limit=500)
    rows.sort(key=lambda r: r.get("created_at") or "", reverse=True)
    return [TaskResponse.model_validate(r) for r in rows]


@router.get("/phase/{phase_id}", response_model=list[TaskResponse])
async def list_tasks(phase_id: UUID, user: AuthUser = Depends(get_current_user)):
    phase = phases_repo.get(phase_id)
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")
    project_service.get_project(UUID(str(phase["project_id"])), user)
    rows = tasks_repo.list(filters={"phase_id": str(phase_id)}, limit=200)
    return [TaskResponse.model_validate(r) for r in rows]


@router.post("/phase/{phase_id}", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(phase_id: UUID, body: TaskCreate, user: AuthUser = Depends(get_current_user)):
    phase = phases_repo.get(phase_id)
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")
    project_service.get_project(UUID(str(phase["project_id"])), user)
    row = tasks_repo.insert(
        {
            "phase_id": str(phase_id),
            "project_id": phase["project_id"],
            "title": body.title,
            "description": body.description,
            "assigned_to": str(body.assigned_to) if body.assigned_to else None,
            "priority": body.priority,
            "due_date": body.due_date.isoformat() if body.due_date else None,
            "status": "todo",
        }
    )
    return TaskResponse.model_validate(row)
