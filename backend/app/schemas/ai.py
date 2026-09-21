"""AI conversation schemas."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class AIConversationCreate(BaseModel):
    project_id: UUID | None = None
    conversation_type: str = "requirement_discovery"
    title: str | None = None


class AIConversationResponse(ORMModel):
    id: UUID
    project_id: UUID | None = None
    user_id: UUID
    conversation_type: str
    title: str | None = None
    status: str
    created_at: datetime


class AIMessageCreate(BaseModel):
    content: str = Field(..., min_length=1)


class AIMessageResponse(ORMModel):
    id: UUID
    conversation_id: UUID
    role: str
    content: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime


class RequirementChatRequest(BaseModel):
    project_id: UUID
    message: str = Field(..., min_length=1)
    conversation_id: UUID | None = None


class RequirementChatResponse(BaseModel):
    conversation_id: UUID
    user_message: AIMessageResponse
    assistant_message: AIMessageResponse
    structured_output: dict[str, Any] | None = None
