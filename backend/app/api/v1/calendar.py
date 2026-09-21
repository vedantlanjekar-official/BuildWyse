"""Calendar event endpoints."""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field

from app.core.security import AuthUser
from app.dependencies.auth import get_current_user
from app.repositories.supabase_client import Repository, milestones_repo, phases_repo
from app.services.project_service import project_service

router = APIRouter()
calendar_events_repo = Repository("calendar_events")


class CalendarEventCreate(BaseModel):
    project_id: UUID
    title: str = Field(..., min_length=1)
    description: str | None = None
    event_type: str = "deadline"
    starts_at: datetime
    ends_at: datetime | None = None
    phase_id: UUID | None = None
    milestone_id: UUID | None = None


def _phase_deadline_events(project_id: str) -> list[dict]:
    events = []
    for phase in phases_repo.list(filters={"project_id": project_id}, limit=100):
        name = phase.get("name", "Phase")
        description = phase.get("description")
        phase_id = str(phase["id"])

        start_date = phase.get("planned_start_date")
        if start_date:
            starts_at = start_date if "T" in str(start_date) else f"{start_date}T00:00:00+00:00"
            events.append(
                {
                    "id": f"phase-start-{phase['id']}",
                    "project_id": project_id,
                    "phase_id": phase_id,
                    "milestone_id": None,
                    "title": f"Phase start: {name}",
                    "description": description,
                    "event_type": "phase_start",
                    "starts_at": starts_at,
                    "ends_at": None,
                    "synthetic": True,
                }
            )

        end_date = phase.get("planned_end_date")
        if end_date:
            starts_at = end_date if "T" in str(end_date) else f"{end_date}T23:59:59+00:00"
            events.append(
                {
                    "id": f"phase-{phase['id']}",
                    "project_id": project_id,
                    "phase_id": phase_id,
                    "milestone_id": None,
                    "title": f"Phase deadline: {name}",
                    "description": description,
                    "event_type": "deadline",
                    "starts_at": starts_at,
                    "ends_at": None,
                    "synthetic": True,
                }
            )
    return events


def _milestone_deadline_events(project_id: str) -> list[dict]:
    events = []
    for milestone in milestones_repo.list(filters={"project_id": project_id}, limit=200):
        due_date = milestone.get("due_date")
        if not due_date:
            continue
        starts_at = due_date if "T" in str(due_date) else f"{due_date}T23:59:59+00:00"
        events.append(
            {
                "id": f"milestone-{milestone['id']}",
                "project_id": project_id,
                "phase_id": str(milestone["phase_id"]) if milestone.get("phase_id") else None,
                "milestone_id": str(milestone["id"]),
                "title": f"Milestone: {milestone.get('title', 'Milestone')}",
                "description": milestone.get("description"),
                "event_type": "deadline",
                "starts_at": starts_at,
                "ends_at": None,
                "synthetic": True,
            }
        )
    return events


@router.get("/project/{project_id}")
async def list_events(project_id: UUID, user: AuthUser = Depends(get_current_user)):
    project_service.get_project(project_id, user)
    pid = str(project_id)
    events = calendar_events_repo.list(filters={"project_id": pid}, limit=200)
    events.sort(key=lambda e: e.get("starts_at") or "")
    events.extend(_phase_deadline_events(pid))
    events.extend(_milestone_deadline_events(pid))
    return events


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_event(body: CalendarEventCreate, user: AuthUser = Depends(get_current_user)):
    project_service.get_project(body.project_id, user)
    row = calendar_events_repo.insert(
        {
            "project_id": str(body.project_id),
            "phase_id": str(body.phase_id) if body.phase_id else None,
            "milestone_id": str(body.milestone_id) if body.milestone_id else None,
            "title": body.title,
            "description": body.description,
            "event_type": body.event_type,
            "starts_at": body.starts_at.isoformat(),
            "ends_at": body.ends_at.isoformat() if body.ends_at else None,
            "created_by": user.id,
        }
    )
    return row
