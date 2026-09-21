"""Requirement schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class RequirementCreate(BaseModel):
    title: str = Field(..., min_length=1)
    requirement_type: str = "functional"
    content: str | None = None
    priority: str = "medium"


class RequirementUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    status: str | None = None
    priority: str | None = None


class RequirementResponse(ORMModel):
    id: UUID
    project_id: UUID
    title: str
    requirement_type: str
    content: str | None = None
    status: str
    priority: str
    source: str
    current_version: int
    created_at: datetime
