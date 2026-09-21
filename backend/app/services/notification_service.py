"""Notification dispatch service."""

from __future__ import annotations

from uuid import UUID

from app.core.config import get_settings
from app.repositories.supabase_client import notifications_repo
from integrations.email.factory import get_email_provider


class NotificationService:
    def __init__(self) -> None:
        settings = get_settings()
        try:
            self.email = get_email_provider(
                mode=settings.email_mode,
                api_key=settings.email_api_key,
                from_address=settings.email_from,
            )
        except RuntimeError:
            # Fall back so app boot is not blocked by missing email credentials
            from integrations.email.console import ConsoleEmailProvider

            self.email = ConsoleEmailProvider()

    def notify(
        self,
        *,
        user_id: str,
        notification_type: str,
        title: str,
        body: str | None = None,
        project_id: UUID | str | None = None,
        action_url: str | None = None,
        send_email: bool = False,
        email: str | None = None,
    ) -> dict:
        row = notifications_repo.insert(
            {
                "user_id": user_id,
                "project_id": str(project_id) if project_id else None,
                "notification_type": notification_type,
                "title": title,
                "body": body,
                "action_url": action_url,
                "is_read": False,
            }
        )
        if send_email and email:
            try:
                self.email.send(to=email, subject=title, body=body or title)
            except Exception:
                # Never block core flows on outbound email failures
                pass
        return row

    def list_for_user(self, user_id: str, *, unread_only: bool = False, limit: int = 50) -> list[dict]:
        rows = notifications_repo.list(filters={"user_id": user_id}, limit=limit)
        if unread_only:
            rows = [r for r in rows if not r.get("is_read")]
        return rows

    def mark_read(self, user_id: str, notification_ids: list[UUID]) -> int:
        count = 0
        for nid in notification_ids:
            row = notifications_repo.get(nid)
            if row and str(row.get("user_id")) == user_id:
                notifications_repo.update(nid, {"is_read": True})
                count += 1
        return count


notification_service = NotificationService()
