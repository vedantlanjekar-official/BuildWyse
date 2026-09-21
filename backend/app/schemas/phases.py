"""Phase, milestone, task, submission schemas."""

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class PhaseCreate(BaseModel):
    phase_number: int = Field(..., gt=0)
    name: str
    description: str | None = None
    objectives: list[str] = Field(default_factory=list)
    planned_start_date: date | None = None
    planned_end_date: date | None = None


class PhaseUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    status: str | None = None
    planned_start_date: date | None = None
    planned_end_date: date | None = None
    actual_start_date: date | None = None
    actual_end_date: date | None = None
    objectives: list[str] | None = None


class PhaseResponse(ORMModel):
    id: UUID
    project_id: UUID
    phase_number: int
    name: str
    description: str | None = None
    objectives: list[str] | None = None
    status: str
    planned_start_date: date | None = None
    planned_end_date: date | None = None
    actual_start_date: date | None = None
    actual_end_date: date | None = None
    created_at: datetime
    updated_at: datetime | None = None


class MilestoneCreate(BaseModel):
    title: str
    description: str | None = None
    due_date: date | None = None
    payment_amount: Decimal | None = None
    sequence_number: int = 1


class MilestoneResponse(ORMModel):
    id: UUID
    phase_id: UUID
    project_id: UUID
    title: str
    status: str
    payment_amount: Decimal | None = None
    due_date: date | None = None
    created_at: datetime


class TaskCreate(BaseModel):
    title: str
    description: str | None = None
    assigned_to: UUID | None = None
    priority: str = "medium"
    due_date: date | None = None


class TaskResponse(ORMModel):
    id: UUID
    phase_id: UUID
    project_id: UUID
    title: str
    status: str
    assigned_to: UUID | None = None
    created_at: datetime


class SubmissionCreate(BaseModel):
    submission_notes: str | None = None


class SubmissionResponse(ORMModel):
    id: UUID
    phase_id: UUID
    project_id: UUID
    submitted_by: UUID
    status: str
    submission_notes: str | None = None
    submitted_at: datetime | None = None
    reviewed_at: datetime | None = None
    created_at: datetime | None = None


class ApprovalRequest(BaseModel):
    entity_type: str
    entity_id: UUID
    approval_notes: str | None = None


class EvidenceCreate(BaseModel):
    evidence_type: str
    title: str
    url: str | None = None
    description: str | None = None
