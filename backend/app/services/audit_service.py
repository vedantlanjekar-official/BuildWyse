"""Audit logging service."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from app.middleware.audit import audit_ip, audit_user_agent
from app.repositories.supabase_client import audit_logs_repo


class AuditService:
    def log(
        self,
        *,
        actor_id: str | UUID | None,
        action: str,
        entity_type: str,
        entity_id: str | UUID | None = None,
        project_id: str | UUID | None = None,
        old_values: dict[str, Any] | None = None,
        new_values: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        row = audit_logs_repo.insert(
            {
                "actor_id": str(actor_id) if actor_id else None,
                "action": action,
                "entity_type": entity_type,
                "entity_id": str(entity_id) if entity_id else None,
                "project_id": str(project_id) if project_id else None,
                "old_values": old_values,
                "new_values": new_values,
                "ip_address": audit_ip.get(),
                "user_agent": audit_user_agent.get(),
            }
        )
        return row


audit_service = AuditService()
