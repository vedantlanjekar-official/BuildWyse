"""Connect — realtime project chat and meeting scheduling."""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.security import AuthUser
from app.dependencies.auth import get_current_user
from app.services.connect_service import connect_service
from app.services.project_service import ProjectAccessError, project_service

router = APIRouter()


def _require_project(project_id: UUID, user: AuthUser) -> dict:
    try:
        return project_service.get_project(project_id, user)
    except LookupError:
        raise HTTPException(status_code=404, detail="Project not found")
    except ProjectAccessError:
        raise HTTPException(status_code=403, detail="Access denied")


class ChatMessageCreate(BaseModel):
    body: str = Field(..., min_length=1, max_length=8000)


class MeetingCreate(BaseModel):
    subject: str = Field(..., min_length=2, max_length=200)
    scheduled_at: datetime
    duration_minutes: int = Field(default=60, ge=15, le=480)
    notes: str | None = None
    meeting_type: str = "client_freelancer"


class MeetingReject(BaseModel):
    reason: str | None = Field(default=None, max_length=1000)


@router.get("/project/{project_id}/messages")
async def list_messages(project_id: UUID, user: AuthUser = Depends(get_current_user)):
    _require_project(project_id, user)
    return connect_service.list_messages(str(project_id))


@router.post("/project/{project_id}/messages", status_code=status.HTTP_201_CREATED)
async def send_message(
    project_id: UUID,
    body: ChatMessageCreate,
    user: AuthUser = Depends(get_current_user),
):
    project = _require_project(project_id, user)
    try:
        return connect_service.send_message(project=project, sender_id=user.id, body=body.body)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/project/{project_id}/meetings")
async def list_meetings(project_id: UUID, user: AuthUser = Depends(get_current_user)):
    _require_project(project_id, user)
    return connect_service.list_meetings(str(project_id))


@router.post("/project/{project_id}/meetings", status_code=status.HTTP_201_CREATED)
async def schedule_meeting(
    project_id: UUID,
    body: MeetingCreate,
    user: AuthUser = Depends(get_current_user),
):
    project = _require_project(project_id, user)
    try:
        return connect_service.schedule_meeting(
            project=project,
            actor_id=user.id,
            subject=body.subject.strip(),
            scheduled_at=body.scheduled_at,
            duration_minutes=body.duration_minutes,
            notes=body.notes,
            meeting_type=body.meeting_type,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except Exception as exc:
        # Log unexpected errors but avoid leaking email-provider noise as 400s when meeting saved
        raise HTTPException(status_code=500, detail=f"Failed to schedule meeting: {exc}")


@router.post("/meetings/{meeting_id}/approve")
async def approve_meeting(meeting_id: UUID, user: AuthUser = Depends(get_current_user)):
    from app.repositories.supabase_client import Repository

    meeting = Repository("meetings").get(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    project = _require_project(UUID(str(meeting["project_id"])), user)
    try:
        return connect_service.approve_meeting(meeting_id=str(meeting_id), actor_id=user.id, project=project)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except LookupError:
        raise HTTPException(status_code=404, detail="Meeting not found")


@router.post("/meetings/{meeting_id}/reject")
async def reject_meeting(
    meeting_id: UUID,
    body: MeetingReject,
    user: AuthUser = Depends(get_current_user),
):
    from app.repositories.supabase_client import Repository

    meeting = Repository("meetings").get(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    project = _require_project(UUID(str(meeting["project_id"])), user)
    try:
        return connect_service.reject_meeting(
            meeting_id=str(meeting_id),
            actor_id=user.id,
            project=project,
            reason=body.reason,
        )
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except LookupError:
        raise HTTPException(status_code=404, detail="Meeting not found")
