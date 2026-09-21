"""Change request (CRMS) schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class ChangeRequestCreate(BaseModel):
    title: str = Field(..., min_length=3)
    description: str = Field(..., min_length=10)
    change_type: str = "scope"
    priority: str = "medium"


class ChangeRequestUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    priority: str | None = None


class ChangeRequestResponse(ORMModel):
    id: UUID
    project_id: UUID
    requested_by: UUID
    title: str
    description: str
    change_type: str
    status: str
    priority: str
    created_at: datetime
