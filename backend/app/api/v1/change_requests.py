"""CRMS change request endpoints."""

from uuid import UUID

from ai.services import change_management_ai
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.security import AuthUser, Role
from app.dependencies.auth import get_current_user
from app.schemas.change_requests import ChangeRequestCreate
from app.services.crms_service import crms_service
from app.services.project_service import ProjectAccessError, project_service

router = APIRouter()


class FreelancerChangeResponse(BaseModel):
    comment: str = Field(..., min_length=3)
    budget_amount: float = Field(..., ge=0)
    currency: str = "INR"
    estimated_days: int | None = Field(default=None, ge=1)


class ChangeApprovalBody(BaseModel):
    status: str = "approved"
    notes: str | None = None
    approval_type: str | None = None  # optional override; defaults by role


@router.get("/project/{project_id}")
async def list_change_requests(project_id: UUID, user: AuthUser = Depends(get_current_user)):
    project_service.get_project(project_id, user)
    return crms_service.list_for_project(project_id)


@router.get("/{change_id}")
async def get_change_request(change_id: UUID, user: AuthUser = Depends(get_current_user)):
    try:
        detail = crms_service.get_detail(change_id)
    except LookupError:
        raise HTTPException(status_code=404, detail="Change request not found")
    project_service.get_project(UUID(str(detail["project_id"])), user)
    return detail


@router.post("/project/{project_id}", status_code=status.HTTP_201_CREATED)
async def create_change_request(
    project_id: UUID,
    body: ChangeRequestCreate,
    user: AuthUser = Depends(get_current_user),
):
    project_service.get_project(project_id, user)
    row = crms_service.create_change_request(project_id, user.id, body.model_dump())
    ai_analysis = change_management_ai.generate(body.description)
    return {**row, "ai_analysis": ai_analysis.model_dump()}


@router.post("/{change_id}/freelancer-response")
async def freelancer_response(
    change_id: UUID,
    body: FreelancerChangeResponse,
    user: AuthUser = Depends(get_current_user),
):
    if not user.has_role(Role.FREELANCER, Role.TEAM_LEADER, Role.ENTERPRISE_MANAGER) and not user.is_admin:
        raise HTTPException(status_code=403, detail="Only freelancers can submit budget responses")
    try:
        detail = crms_service.get_detail(change_id)
        project_service.get_project(UUID(str(detail["project_id"])), user)
        return crms_service.add_freelancer_response(
            change_id,
            user.id,
            comment=body.comment,
            budget_amount=body.budget_amount,
            currency=body.currency,
            estimated_days=body.estimated_days,
        )
    except LookupError:
        raise HTTPException(status_code=404, detail="Change request not found")
    except ProjectAccessError:
        raise HTTPException(status_code=403, detail="Access denied")


@router.post("/{change_id}/approve")
async def approve_change_request(
    change_id: UUID,
    body: ChangeApprovalBody,
    user: AuthUser = Depends(get_current_user),
):
    try:
        detail = crms_service.get_detail(change_id)
        project = project_service.get_project(UUID(str(detail["project_id"])), user)
    except LookupError:
        raise HTTPException(status_code=404, detail="Change request not found")
    except ProjectAccessError:
        raise HTTPException(status_code=403, detail="Access denied")

    approval_type = body.approval_type
    if not approval_type:
        if user.is_admin:
            approval_type = "client"
        elif str(project.get("client_id")) == user.id or user.has_role(Role.CLIENT):
            approval_type = "client"
        else:
            approval_type = "freelancer"

    try:
        return crms_service.approve(
            change_id,
            user.id,
            approval_type=approval_type,
            status=body.status,
            notes=body.notes,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
