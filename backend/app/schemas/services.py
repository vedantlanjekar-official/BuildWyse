"""After-sales service (ASSM) schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class ServiceRequestCreate(BaseModel):
    title: str = Field(..., min_length=3)
    description: str = Field(..., min_length=10)
    service_type: str = "maintenance"
    estimated_effort_hours: float = Field(default=0, ge=0)
    modules_affected: list[str] = Field(default_factory=list)
    scope_expansion_percent: float = Field(default=0, ge=0, le=100)


class ServiceClassification(BaseModel):
    classification: str  # AFTER_SALES_SERVICE | NEW_PROJECT
    reason: str
    thresholds: dict[str, float]


class ServiceRequestResponse(ORMModel):
    id: UUID
    project_id: UUID
    requested_by: UUID
    title: str
    description: str
    service_type: str
    status: str
    classification: str | None = None
    created_at: datetime
