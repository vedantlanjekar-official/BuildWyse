"""Technical proposal endpoints (Supabase-backed)."""

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field

from app.core.security import AuthUser, Role
from app.dependencies.auth import require_roles, get_current_user
from app.repositories.supabase_client import Repository
from app.services.audit_service import audit_service
from app.services.project_service import project_service

router = APIRouter()
proposals_repo = Repository("technical_proposals")


class ProposalCreate(BaseModel):
    project_id: UUID
    proposed_solution: str = Field(..., min_length=10)
    technical_perspective: str = Field(..., min_length=10)
    project_understanding: str = Field(..., min_length=10)
    title: str = "Technical Proposal"
    timeline_estimate_days: int | None = 21
    proposed_amount: float | None = None


@router.get("/project/{project_id}")
async def list_proposals(project_id: UUID, user: AuthUser = Depends(get_current_user)):
    project_service.get_project(project_id, user)
    return proposals_repo.list(filters={"project_id": str(project_id)}, limit=50)


@router.post("", status_code=status.HTTP_201_CREATED)
async def submit_proposal(body: ProposalCreate, user: AuthUser = Depends(require_roles(Role.FREELANCER))):
    project_service.get_project(body.project_id, user)
    approach = (
        f"Solution:\n{body.proposed_solution}\n\n"
        f"Technical Perspective:\n{body.technical_perspective}\n\n"
        f"Project Understanding:\n{body.project_understanding}"
    )
    row = proposals_repo.insert(
        {
            "project_id": str(body.project_id),
            "freelancer_user_id": user.id,
            "title": body.title,
            "approach_summary": approach,
            "proposed_solution": body.proposed_solution,
            "technical_perspective": body.technical_perspective,
            "project_understanding": body.project_understanding,
            "timeline_estimate_days": body.timeline_estimate_days,
            "proposed_amount": body.proposed_amount,
            "currency": "INR",
            "status": "submitted",
            "submitted_at": datetime.now(timezone.utc).isoformat(),
            "metadata": {
                "proposed_solution": body.proposed_solution,
                "technical_perspective": body.technical_perspective,
                "project_understanding": body.project_understanding,
            },
        }
    )
    audit_service.log(
        actor_id=user.id,
        action="proposal.submit",
        entity_type="technical_proposal",
        entity_id=row["id"],
        project_id=body.project_id,
        new_values=row,
    )
    return row
