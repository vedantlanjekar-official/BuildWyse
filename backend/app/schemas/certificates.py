"""Certificate schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.schemas.common import ORMModel


class CertificateIssueRequest(BaseModel):
    certificate_type: str = "project_completion"
    issued_to: UUID | None = None


class CertificateResponse(ORMModel):
    id: UUID
    project_id: UUID
    certificate_number: str
    certificate_type: str
    issued_to: UUID
    status: str
    issued_at: datetime


class CertificateVerifyResponse(BaseModel):
    certificate_number: str
    valid: bool
    status: str
    project_id: UUID | None = None
    issued_at: datetime | None = None
