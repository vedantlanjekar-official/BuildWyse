"""Document API schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class DocumentGenerateRequest(BaseModel):
    project_id: UUID
    document_type: str = "all"
    context: str = ""


class DocumentVersionResponse(BaseModel):
    id: UUID
    document_id: UUID
    version_number: int
    file_url: str | None = None
    generated_by: str = "ai"
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class DocumentResponse(BaseModel):
    id: UUID
    project_id: UUID
    document_type: str
    title: str
    status: str
    visibility: str = "partial"
    current_version: int = 1
    pdf_available: bool = False
    pdf_url: str | None = None
    version_created_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class DocumentDetailResponse(DocumentResponse):
    versions: list[DocumentVersionResponse] = Field(default_factory=list)


class DocumentGenerateResponse(BaseModel):
    document: DocumentResponse
    version: DocumentVersionResponse | None = None
    idempotent: bool = False


class DocumentGenerateAllResponse(BaseModel):
    documents: list[DocumentGenerateResponse]
    count: int
