"""After-sales service (ASSM) endpoints."""

from uuid import UUID

from ai.services import after_sales_ai
from fastapi import APIRouter, Depends, status

from app.core.security import AuthUser
from app.dependencies.auth import get_current_user
from app.schemas.services import ServiceClassification, ServiceRequestCreate, ServiceRequestResponse
from app.services.assm_service import assm_service, classify_service_request
from app.services.project_service import project_service

router = APIRouter()


@router.post("/classify", response_model=ServiceClassification)
async def classify_request(
    scope_expansion_percent: float = 0,
    estimated_effort_hours: float = 0,
    modules_affected: list[str] | None = None,
    user: AuthUser = Depends(get_current_user),
):
    result = classify_service_request(
        scope_expansion_percent=scope_expansion_percent,
        estimated_effort_hours=estimated_effort_hours,
        modules_affected=modules_affected or [],
    )
    return ServiceClassification(**result)


@router.post("/project/{project_id}", response_model=ServiceRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_service_request(
    project_id: UUID,
    body: ServiceRequestCreate,
    user: AuthUser = Depends(get_current_user),
):
    project_service.get_project(project_id, user)
    row = assm_service.create_service_request(project_id, user.id, body.model_dump())
    ai_result = after_sales_ai.generate(body.description)
    return ServiceRequestResponse.model_validate(
        {
            **row,
            "classification": row.get("classification") or ai_result.classification,
        }
    )


@router.get("/project/{project_id}")
async def list_service_requests(project_id: UUID, user: AuthUser = Depends(get_current_user)):
    project_service.get_project(project_id, user)
    from app.repositories.supabase_client import service_requests_repo

    return service_requests_repo.list(filters={"project_id": str(project_id)}, limit=100)
