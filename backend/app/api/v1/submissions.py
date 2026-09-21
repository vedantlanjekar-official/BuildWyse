"""Phase submission, approval, and rejection endpoints."""

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.security import AuthUser, Role
from app.dependencies.auth import get_current_user
from app.repositories.supabase_client import (
    Repository,
    approvals_repo,
    payment_orders_repo,
    phases_repo,
    submissions_repo,
)
from app.schemas.phases import ApprovalRequest, SubmissionCreate, SubmissionResponse
from app.services.audit_service import audit_service
from app.services.notification_service import notification_service
from app.services.project_service import project_service

router = APIRouter()
rejection_records_repo = Repository("rejection_records")


class RejectRequest(BaseModel):
    submission_id: UUID
    rejection_reason: str = Field(..., min_length=10)
    entity_type: str = "submission"


def _require_client_for_project(project: dict, user: AuthUser) -> None:
    if user.is_admin:
        return
    if str(project.get("client_id")) != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the project client can approve/reject")


def _phase_paid(project_id: str, phase_id: str) -> bool:
    orders = payment_orders_repo.list(filters={"project_id": project_id}, limit=200)
    for order in orders:
        if str(order.get("status")) not in {"paid", "completed", "captured"}:
            continue
        meta = order.get("metadata") if isinstance(order.get("metadata"), dict) else {}
        if str(meta.get("phase_id") or "") == phase_id:
            return True
    return False


def _assert_prior_phase_paid(phase: dict) -> None:
    """Block work on phase N until phase N-1 is paid after approval."""
    project_id = str(phase["project_id"])
    number = int(phase.get("phase_number") or 0)
    if number <= 1:
        return
    siblings = phases_repo.list(filters={"project_id": project_id}, limit=100)
    prior = [p for p in siblings if int(p.get("phase_number") or 0) == number - 1]
    if not prior:
        return
    prev = prior[0]
    prev_status = str(prev.get("status") or "")
    if prev_status in {"approved", "completed"} and not _phase_paid(project_id, str(prev["id"])):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Phase {prev.get('phase_number')} must be paid before Phase {number} can continue. "
                "Ask the client to complete payment from Health → Payments."
            ),
        )


@router.get("/project/{project_id}", response_model=list[SubmissionResponse])
async def list_project_submissions(project_id: UUID, user: AuthUser = Depends(get_current_user)):
    project_service.get_project(project_id, user)
    rows = submissions_repo.list(filters={"project_id": str(project_id)}, limit=200)
    rows.sort(key=lambda r: r.get("submitted_at") or r.get("created_at") or "", reverse=True)
    return [SubmissionResponse.model_validate(r) for r in rows]


@router.post("/phase/{phase_id}", response_model=SubmissionResponse, status_code=status.HTTP_201_CREATED)
async def submit_phase(phase_id: UUID, body: SubmissionCreate, user: AuthUser = Depends(get_current_user)):
    phase = phases_repo.get(phase_id)
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")
    project_id = UUID(str(phase["project_id"]))
    project = project_service.get_project(project_id, user)
    _assert_prior_phase_paid(phase)
    # Freelancer or assigned resource submits
    if not user.is_admin and str(project.get("client_id")) == user.id:
        # client may also submit in demos, allow
        pass
    row = submissions_repo.insert(
        {
            "phase_id": str(phase_id),
            "project_id": str(project_id),
            "submitted_by": user.id,
            "submission_notes": body.submission_notes,
            "status": "submitted",
            "submitted_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    phases_repo.update(phase_id, {"status": "submitted"})
    audit_service.log(
        actor_id=user.id,
        action="submission.create",
        entity_type="submission",
        entity_id=row["id"],
        project_id=project_id,
        new_values=row,
    )
    try:
        notification_service.notify(
            user_id=str(project["client_id"]),
            notification_type="submission",
            title="Phase submitted",
            body=f"Phase '{phase.get('name')}' was submitted for review.",
            project_id=str(project_id),
        )
    except Exception:
        pass
    return SubmissionResponse.model_validate(row)


@router.post("/reject", status_code=status.HTTP_200_OK)
async def reject_submission(body: RejectRequest, user: AuthUser = Depends(get_current_user)):
    submission = submissions_repo.get(body.submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    project_id = UUID(str(submission["project_id"]))
    project = project_service.get_project(project_id, user)
    _require_client_for_project(project, user)

    submissions_repo.update(
        body.submission_id,
        {
            "status": "revision_requested",
            "reviewed_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    phase_id = submission.get("phase_id")
    if phase_id:
        phases_repo.update(phase_id, {"status": "rejected"})

    rejection = rejection_records_repo.insert(
        {
            "project_id": str(project_id),
            "entity_type": "submission",
            "entity_id": str(body.submission_id),
            "rejected_by": user.id,
            "rejection_reason": body.rejection_reason,
            "revision_required": True,
            "rejected_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    audit_service.log(
        actor_id=user.id,
        action="submission.reject",
        entity_type="submission",
        entity_id=body.submission_id,
        project_id=project_id,
        new_values=rejection,
    )
    try:
        notification_service.notify(
            user_id=str(submission["submitted_by"]),
            notification_type="rejection",
            title="Revision required",
            body=body.rejection_reason,
            project_id=str(project_id),
        )
    except Exception:
        pass
    return {"status": "REVISION_REQUIRED", "rejection": rejection}


@router.post("/approve", status_code=status.HTTP_200_OK)
async def approve_entity(body: ApprovalRequest, user: AuthUser = Depends(get_current_user)):
    # Resolve project for authorization
    project_id = None
    if body.entity_type == "submission":
        submission = submissions_repo.get(body.entity_id)
        if not submission:
            raise HTTPException(status_code=404, detail="Submission not found")
        project_id = UUID(str(submission["project_id"]))
        project = project_service.get_project(project_id, user)
        _require_client_for_project(project, user)
        # Freelancer must not approve own work
        if str(submission.get("submitted_by")) == user.id and not user.is_admin:
            raise HTTPException(status_code=403, detail="Cannot approve your own submission")
        submissions_repo.update(
            body.entity_id,
            {"status": "approved", "reviewed_at": datetime.now(timezone.utc).isoformat()},
        )
        if submission.get("phase_id"):
            phases_repo.update(submission["phase_id"], {"status": "approved"})
    elif body.entity_type == "phase":
        phase = phases_repo.get(body.entity_id)
        if not phase:
            raise HTTPException(status_code=404, detail="Phase not found")
        project_id = UUID(str(phase["project_id"]))
        project = project_service.get_project(project_id, user)
        _require_client_for_project(project, user)
        phases_repo.update(body.entity_id, {"status": "approved"})
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported entity_type: {body.entity_type}")

    row = approvals_repo.insert(
        {
            "project_id": str(project_id),
            "entity_type": body.entity_type,
            "entity_id": str(body.entity_id),
            "approved_by": user.id,
            "approval_notes": body.approval_notes,
            "approved_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    audit_service.log(
        actor_id=user.id,
        action="approval.create",
        entity_type=body.entity_type,
        entity_id=body.entity_id,
        project_id=project_id,
        new_values=row,
    )
    return {"approval": row, "status": "APPROVED"}
