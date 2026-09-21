"""Evidence endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import AuthUser
from app.dependencies.auth import get_current_user
from app.repositories.supabase_client import evidence_repo, submissions_repo
from app.schemas.phases import EvidenceCreate
from app.services.project_service import project_service

router = APIRouter()


@router.get("/project/{project_id}")
async def list_project_evidence(project_id: UUID, user: AuthUser = Depends(get_current_user)):
    project_service.get_project(project_id, user)
    rows = evidence_repo.list(filters={"project_id": str(project_id)}, limit=300)
    rows.sort(key=lambda r: r.get("created_at") or "", reverse=True)
    return rows


@router.post("/submission/{submission_id}", status_code=status.HTTP_201_CREATED)
async def add_evidence(submission_id: UUID, body: EvidenceCreate, user: AuthUser = Depends(get_current_user)):
    submission = submissions_repo.get(submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    project_service.get_project(UUID(str(submission["project_id"])), user)
    row = evidence_repo.insert(
        {
            "submission_id": str(submission_id),
            "project_id": submission["project_id"],
            "evidence_type": body.evidence_type,
            "title": body.title,
            "url": body.url,
            "description": body.description,
            "uploaded_by": user.id,
            "metadata": {},
        }
    )
    return row
