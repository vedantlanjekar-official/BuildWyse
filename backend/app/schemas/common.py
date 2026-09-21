"""Shared Pydantic schemas."""

from datetime import datetime
from typing import Any, Generic, TypeVar
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class TimestampedModel(ORMModel):
    id: UUID
    created_at: datetime
    updated_at: datetime | None = None


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int = 1
    page_size: int = 20


class MessageResponse(BaseModel):
    message: str
    detail: dict[str, Any] | None = None


class ErrorResponse(BaseModel):
    error: str
    detail: str | None = None


class IdempotencyHeader(BaseModel):
    idempotency_key: str = Field(..., min_length=8, max_length=128)
