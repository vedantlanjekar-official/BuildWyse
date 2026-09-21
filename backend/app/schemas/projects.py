"""Project schemas."""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.state_machine import ProjectState, TransitionResult
from app.schemas.common import ORMModel


class ProjectBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: str | None = None
    category: str | None = None
    industry: str | None = None
    complexity: str | None = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=200)
    description: str | None = None
    category: str | None = None
    industry: str | None = None
    complexity: str | None = None
    estimated_budget: Decimal | None = None
    development_model: str | None = None


class ProjectResponse(ORMModel):
    id: UUID
    client_id: UUID
    title: str
    description: str | None = None
    state: ProjectState
    category: str | None = None
    industry: str | None = None
    complexity: str | None = None
    assigned_freelancer_id: UUID | None = None
    assigned_org_id: UUID | None = None
    assigned_freelancer_name: str | None = None
    development_model: str | None = None
    estimated_budget: Decimal | None = None
    currency: str = "INR"
    created_at: datetime
    updated_at: datetime | None = None


class ProjectTransitionRequest(BaseModel):
    target_state: ProjectState
    reason: str | None = None


class ProjectTransitionResponse(TransitionResult):
    project_id: UUID
