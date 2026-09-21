"""Project phase endpoints."""

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import AuthUser, Role
from app.dependencies.auth import get_current_user
from app.repositories.supabase_client import (
    evidence_repo,
    payment_orders_repo,
    phases_repo,
    submissions_repo,
)
from app.schemas.phases import PhaseCreate, PhaseResponse, PhaseUpdate
from app.services.audit_service import audit_service
from app.services.project_service import ProjectAccessError, project_service

router = APIRouter()

_ALLOWED_STATUS = {
    "pending",
    "in_progress",
    "submitted",
    "under_review",
    "approved",
    "rejected",
    "completed",
}


def _require_project(project_id: UUID | str, user: AuthUser) -> dict:
    try:
        return project_service.get_project(UUID(str(project_id)), user)
    except LookupError:
        raise HTTPException(status_code=404, detail="Project not found")
    except ProjectAccessError:
        raise HTTPException(status_code=403, detail="Access denied")


def _phase_paid(project_id: str, phase_id: str) -> bool:
    orders = payment_orders_repo.list(filters={"project_id": project_id}, limit=200)
    for order in orders:
        if str(order.get("status")) not in {"paid", "completed", "captured"}:
            continue
        meta = order.get("metadata") if isinstance(order.get("metadata"), dict) else {}
        if str(meta.get("phase_id") or "") == phase_id:
            return True
    return False


@router.get("/project/{project_id}", response_model=list[PhaseResponse])
async def list_phases(project_id: UUID, user: AuthUser = Depends(get_current_user)):
    _require_project(project_id, user)
    rows = phases_repo.list(filters={"project_id": str(project_id)}, limit=100)
    rows.sort(key=lambda r: r.get("phase_number") or 0)
    return [PhaseResponse.model_validate(r) for r in rows]


@router.get("/{phase_id}")
async def get_phase_detail(phase_id: UUID, user: AuthUser = Depends(get_current_user)):
    phase = phases_repo.get(phase_id)
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")
    project = _require_project(phase["project_id"], user)
    submissions = submissions_repo.list(filters={"phase_id": str(phase_id)}, limit=50)
    submissions.sort(key=lambda s: s.get("submitted_at") or s.get("created_at") or "", reverse=True)
    evidence = evidence_repo.list(filters={"project_id": str(phase["project_id"])}, limit=200)
    submission_ids = {str(s["id"]) for s in submissions}
    phase_evidence = [
        e
        for e in evidence
        if str(e.get("submission_id") or "") in submission_ids
        or str((e.get("metadata") or {}).get("phase_id") or "") == str(phase_id)
    ]
    prior = [
        p
        for p in phases_repo.list(filters={"project_id": str(phase["project_id"])}, limit=100)
        if int(p.get("phase_number") or 0) < int(phase.get("phase_number") or 0)
    ]
    prior.sort(key=lambda p: p.get("phase_number") or 0)
    blocking = None
    if prior:
        prev = prior[-1]
        if not _phase_paid(str(phase["project_id"]), str(prev["id"])) and str(prev.get("status")) in {
            "approved",
            "completed",
            "submitted",
            "under_review",
            "in_progress",
        }:
            # Gate start of this phase if previous approved but unpaid, or still open
            if str(prev.get("status")) in {"approved", "completed"} and not _phase_paid(
                str(phase["project_id"]), str(prev["id"])
            ):
                blocking = {
                    "phase_id": prev["id"],
                    "phase_number": prev.get("phase_number"),
                    "phase_name": prev.get("name"),
                    "reason": "previous_phase_unpaid",
                }
    return {
        "phase": PhaseResponse.model_validate(phase).model_dump(),
        "project_id": project["id"],
        "submissions": submissions,
        "evidence": phase_evidence,
        "payment_required_from": blocking,
        "is_paid": _phase_paid(str(phase["project_id"]), str(phase_id)),
    }


@router.post("/project/{project_id}", response_model=PhaseResponse, status_code=status.HTTP_201_CREATED)
async def create_phase(project_id: UUID, body: PhaseCreate, user: AuthUser = Depends(get_current_user)):
    _require_project(project_id, user)
    row = phases_repo.insert(
        {
            "project_id": str(project_id),
            "phase_number": body.phase_number,
            "name": body.name,
            "description": body.description,
            "objectives": body.objectives,
            "status": "pending",
            "planned_start_date": body.planned_start_date.isoformat() if body.planned_start_date else None,
            "planned_end_date": body.planned_end_date.isoformat() if body.planned_end_date else None,
        }
    )
    audit_service.log(
        actor_id=user.id,
        action="phase.create",
        entity_type="phase",
        entity_id=row["id"],
        project_id=project_id,
        new_values=row,
    )
    return PhaseResponse.model_validate(row)


@router.patch("/{phase_id}", response_model=PhaseResponse)
async def update_phase(phase_id: UUID, body: PhaseUpdate, user: AuthUser = Depends(get_current_user)):
    phase = phases_repo.get(phase_id)
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")
    project = _require_project(phase["project_id"], user)
    is_client = str(project.get("client_id")) == str(user.id) or user.has_role(Role.CLIENT, Role.ADMIN)
    if not is_client and not user.is_admin:
        raise HTTPException(status_code=403, detail="Only the project client can edit phase details")

    patch = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if "status" in patch and patch["status"] not in _ALLOWED_STATUS:
        raise HTTPException(status_code=400, detail=f"Invalid status: {patch['status']}")
    for key in ("planned_start_date", "planned_end_date", "actual_start_date", "actual_end_date"):
        if key in patch and patch[key] is not None:
            patch[key] = patch[key].isoformat() if hasattr(patch[key], "isoformat") else patch[key]
    patch["updated_at"] = datetime.now(timezone.utc).isoformat()
    updated = phases_repo.update(phase_id, patch) or {**phase, **patch}
    audit_service.log(
        actor_id=user.id,
        action="phase.update",
        entity_type="phase",
        entity_id=phase_id,
        project_id=phase["project_id"],
        old_values=phase,
        new_values=updated,
    )
    return PhaseResponse.model_validate(updated)


@router.post("/{phase_id}/report")
async def generate_phase_report(phase_id: UUID, user: AuthUser = Depends(get_current_user)):
    """Build a detailed phase health/review report from live phase data."""
    phase = phases_repo.get(phase_id)
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")
    project = _require_project(phase["project_id"], user)
    submissions = submissions_repo.list(filters={"phase_id": str(phase_id)}, limit=50)
    submissions.sort(key=lambda s: s.get("submitted_at") or s.get("created_at") or "", reverse=True)
    evidence = evidence_repo.list(filters={"project_id": str(phase["project_id"])}, limit=200)
    submission_ids = {str(s["id"]) for s in submissions}
    phase_evidence = [e for e in evidence if str(e.get("submission_id") or "") in submission_ids]
    latest = submissions[0] if submissions else None

    report = {
        "title": f"Phase {phase.get('phase_number')} — {phase.get('name')} Review Report",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "project": {"id": project.get("id"), "title": project.get("title")},
        "phase": {
            "id": phase.get("id"),
            "number": phase.get("phase_number"),
            "name": phase.get("name"),
            "status": phase.get("status"),
            "description": phase.get("description"),
            "objectives": phase.get("objectives") or [],
            "planned_start_date": phase.get("planned_start_date"),
            "planned_end_date": phase.get("planned_end_date"),
            "actual_start_date": phase.get("actual_start_date"),
            "actual_end_date": phase.get("actual_end_date"),
        },
        "submission_summary": {
            "count": len(submissions),
            "latest_status": (latest or {}).get("status"),
            "latest_notes": (latest or {}).get("submission_notes"),
            "submitted_at": (latest or {}).get("submitted_at"),
            "reviewed_at": (latest or {}).get("reviewed_at"),
        },
        "evidence_summary": {
            "count": len(phase_evidence),
            "items": [
                {
                    "title": e.get("title"),
                    "type": e.get("evidence_type"),
                    "url": e.get("url"),
                    "description": e.get("description"),
                }
                for e in phase_evidence
            ],
        },
        "findings": [
            f"Phase status is currently '{phase.get('status')}'.",
            f"Planned window: {phase.get('planned_start_date') or '—'} → {phase.get('planned_end_date') or '—'}.",
            f"Actual window: {phase.get('actual_start_date') or '—'} → {phase.get('actual_end_date') or '—'}.",
            f"{len(submissions)} submission(s) recorded for this phase.",
            f"{len(phase_evidence)} proof/link artifact(s) attached.",
        ],
        "recommendation": (
            "Approve and proceed to phase payment if delivery matches acceptance criteria; "
            "otherwise reject with clear revision comments."
            if str(phase.get("status")) in {"submitted", "under_review"}
            else "Continue monitoring phase progress and evidence completeness."
        ),
    }
    return report
