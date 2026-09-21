"""Verification endpoints."""

from uuid import UUID

from ai.services import verification_ai
from fastapi import APIRouter, Depends, HTTPException

from app.core.security import AuthUser
from app.dependencies.auth import get_current_user
from app.repositories.supabase_client import evidence_repo, submissions_repo, verification_reports_repo
from app.services.project_service import project_service

router = APIRouter()


def _map_overall_result(payload: dict) -> str:
    verdict = str(payload.get("overall_result") or payload.get("verdict") or payload.get("status") or "").lower()
    if verdict in {"pass", "passed", "approved", "ok"}:
        return "pass"
    if verdict in {"partial", "warning", "needs_review"}:
        return "partial"
    if verdict in {"fail", "failed", "rejected"}:
        return "fail"
    score = payload.get("compliance_score") or payload.get("score")
    try:
        n = float(score)
        if n >= 80:
            return "pass"
        if n >= 50:
            return "partial"
        return "fail"
    except (TypeError, ValueError):
        return "pending"


@router.get("/project/{project_id}")
async def list_project_verifications(project_id: UUID, user: AuthUser = Depends(get_current_user)):
    project_service.get_project(project_id, user)
    rows = verification_reports_repo.list(filters={"project_id": str(project_id)}, limit=100)
    rows.sort(key=lambda r: r.get("created_at") or "", reverse=True)
    return rows


@router.post("/submission/{submission_id}")
async def verify_submission(submission_id: UUID, user: AuthUser = Depends(get_current_user)):
    submission = submissions_repo.get(submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    project_id = UUID(str(submission["project_id"]))
    project_service.get_project(project_id, user)
    evidence = evidence_repo.list(filters={"submission_id": str(submission_id)}, limit=50)
    context = f"Submission notes: {submission.get('submission_notes')}. Evidence count: {len(evidence)}"
    result = verification_ai.generate(context)
    payload = result.model_dump()

    report = verification_reports_repo.insert(
        {
            "project_id": str(project_id),
            "phase_id": str(submission["phase_id"]) if submission.get("phase_id") else None,
            "submission_id": str(submission_id),
            "report_type": "ai_assisted",
            "overall_result": _map_overall_result(payload),
            "compliance_score": payload.get("compliance_score") or payload.get("score"),
            "findings": payload.get("findings") or [payload],
            "generated_by": "ai",
        }
    )
    return {"report": report, "ai": payload}
