"""Notification endpoints."""

from fastapi import APIRouter, Depends

from app.core.security import AuthUser
from app.dependencies.auth import get_current_user
from app.schemas.notifications import NotificationMarkRead, NotificationResponse
from app.services.notification_service import notification_service

router = APIRouter()


@router.get("", response_model=list[NotificationResponse])
async def list_notifications(unread_only: bool = False, user: AuthUser = Depends(get_current_user)):
    rows = notification_service.list_for_user(user.id, unread_only=unread_only)
    return [NotificationResponse.model_validate(r) for r in rows]


@router.post("/mark-read")
async def mark_notifications_read(body: NotificationMarkRead, user: AuthUser = Depends(get_current_user)):
    count = notification_service.mark_read(user.id, body.notification_ids)
    return {"marked_read": count}
