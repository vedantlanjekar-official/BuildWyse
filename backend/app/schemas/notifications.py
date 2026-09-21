"""Notification schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.schemas.common import ORMModel


class NotificationResponse(ORMModel):
    id: UUID
    user_id: UUID
    project_id: UUID | None = None
    notification_type: str
    title: str
    body: str | None = None
    is_read: bool
    created_at: datetime


class NotificationMarkRead(BaseModel):
    notification_ids: list[UUID]
