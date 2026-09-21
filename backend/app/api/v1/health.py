"""Project health endpoints."""

from uuid import UUID

from ai.services import health_ai
from fastapi import APIRouter, Depends, HTTPException

from app.core.security import AuthUser
from app.dependencies.auth import get_current_user
from app.services.health_service import health_service
from app.services.project_service import ProjectAccessError, project_service

router = APIRouter()


@router.get("/project/{project_id}")
async def get_project_health(project_id: UUID, user: AuthUser = Depends(get_current_user)):
    try:
        project_service.get_project(project_id, user)
    except LookupError:
        raise HTTPException(status_code=404, detail="Project not found")
    except ProjectAccessError:
        raise HTTPException(status_code=403, detail="Access denied")
    assessment = health_service.assess_project(project_id)
    try:
        ai_result = health_ai.generate(str(assessment))
        ai_payload = ai_result.model_dump()
    except Exception:
        ai_payload = {"summary": "Health metrics loaded. AI insights temporarily unavailable."}
    return {"assessment": assessment, "ai_insights": ai_payload}
