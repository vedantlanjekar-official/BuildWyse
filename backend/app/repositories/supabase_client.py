"""Supabase client wrapper with in-memory fallback."""

from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

from app.core.config import get_settings
from app.repositories.memory_store import get_memory_store

logger = logging.getLogger(__name__)

_supabase_client: Any | None = None
_using_memory = False


def get_supabase():
    """Return Supabase client or None if not configured."""
    global _supabase_client, _using_memory
    settings = get_settings()

    if _supabase_client is not None:
        return _supabase_client

    if not settings.supabase_configured:
        _using_memory = True
        logger.warning("Supabase not configured — using in-memory store")
        return None

    try:
        from supabase import create_client

        key = settings.supabase_service_role_key or settings.supabase_anon_key
        if not settings.supabase_service_role_key:
            logger.warning(
                "SUPABASE_SERVICE_ROLE_KEY empty — using anon key; server writes may be limited by RLS"
            )
        _supabase_client = create_client(settings.supabase_url, key)
        return _supabase_client
    except Exception as exc:
        _using_memory = True
        logger.warning("Failed to init Supabase client (%s) — using in-memory store", exc)
        return None


def is_memory_mode() -> bool:
    get_supabase()
    return _using_memory


class Repository:
    """Generic repository with Supabase + memory fallback."""

    def __init__(self, table: str) -> None:
        self.table = table

    @property
    def _memory(self):
        return get_memory_store()

    def _client_table(self):
        client = get_supabase()
        if client is None:
            return None
        return client.table(self.table)

    def insert(self, data: dict[str, Any]) -> dict[str, Any]:
        tbl = self._client_table()
        if tbl is None:
            return self._memory.insert(self.table, data)
        payload = {k: (str(v) if isinstance(v, UUID) else v) for k, v in data.items()}
        try:
            result = tbl.insert(payload).execute()
            return result.data[0] if result.data else payload
        except Exception as exc:
            logger.warning("Supabase insert failed on %s (%s) — memory fallback", self.table, exc)
            return self._memory.insert(self.table, data)

    def update(self, row_id: str | UUID, data: dict[str, Any]) -> dict[str, Any] | None:
        tbl = self._client_table()
        if tbl is None:
            return self._memory.update(self.table, row_id, data)
        payload = {k: (str(v) if isinstance(v, UUID) else v) for k, v in data.items()}
        try:
            result = tbl.update(payload).eq("id", str(row_id)).execute()
            if result.data:
                return result.data[0]
        except Exception as exc:
            logger.warning("Supabase update failed on %s (%s) — memory fallback", self.table, exc)
        return self._memory.update(self.table, row_id, data)

    def get(self, row_id: str | UUID) -> dict[str, Any] | None:
        tbl = self._client_table()
        if tbl is None:
            return self._memory.get(self.table, row_id)
        remote: dict[str, Any] | None = None
        try:
            # Prefer limit(1) over maybe_single() — maybe_single raises/returns
            # None without data when 0 rows, which skips memory fallback.
            result = tbl.select("*").eq("id", str(row_id)).limit(1).execute()
            if result.data:
                remote = result.data[0]
        except Exception as exc:
            logger.warning("Supabase get failed on %s (%s) — memory fallback", self.table, exc)
        if remote:
            return remote
        return self._memory.get(self.table, row_id)

    def list(
        self,
        *,
        filters: dict[str, Any] | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        tbl = self._client_table()
        remote: list[dict[str, Any]] = []
        remote_ok = False
        if tbl is None:
            return self._memory.list(self.table, filters=filters, limit=limit, offset=offset)
        try:
            query = tbl.select("*")
            if filters:
                for key, value in filters.items():
                    query = query.eq(key, str(value) if isinstance(value, UUID) else value)
            result = query.range(offset, offset + max(limit, 1) - 1).execute()
            remote = result.data or []
            remote_ok = True
        except Exception as exc:
            logger.warning("Supabase list failed on %s (%s) — memory fallback", self.table, exc)

        memory_rows = self._memory.list(self.table, filters=filters, limit=10000, offset=0)
        if not remote_ok:
            return memory_rows[offset : offset + limit]

        # Merge so rows that only exist in memory (failed remote insert) still appear.
        by_id: dict[str, dict[str, Any]] = {str(r["id"]): r for r in memory_rows if r.get("id")}
        for row in remote:
            if row.get("id"):
                by_id[str(row["id"])] = row
        merged = list(by_id.values())
        return merged[:limit]

    def delete(self, row_id: str | UUID, *, strict: bool = False) -> bool:
        tbl = self._client_table()
        if tbl is None:
            return self._memory.delete(self.table, row_id)
        try:
            tbl.delete().eq("id", str(row_id)).execute()
            return True
        except Exception as exc:
            if strict:
                raise
            logger.warning("Supabase delete failed on %s (%s) — memory fallback", self.table, exc)
            return self._memory.delete(self.table, row_id)

    def delete_where(self, filters: dict[str, Any], *, strict: bool = False) -> int:
        """Delete rows matching filters. Returns approximate deleted count."""
        if not filters:
            return 0
        tbl = self._client_table()
        if tbl is None:
            rows = self._memory.list(self.table, filters=filters, limit=10000)
            for row in rows:
                self._memory.delete(self.table, row["id"])
            return len(rows)
        try:
            query = tbl.delete()
            for key, value in filters.items():
                query = query.eq(key, str(value) if isinstance(value, UUID) else value)
            result = query.execute()
            return len(result.data or [])
        except Exception as exc:
            if strict:
                raise
            logger.warning("Supabase delete_where failed on %s (%s) — memory fallback", self.table, exc)
            rows = self._memory.list(self.table, filters=filters, limit=10000)
            for row in rows:
                self._memory.delete(self.table, row["id"])
            return len(rows)


# Table-specific repositories (names match database schema)
projects_repo = Repository("projects")
profiles_repo = Repository("profiles")
user_roles_repo = Repository("user_roles")
requirements_repo = Repository("project_requirements")
ai_conversations_repo = Repository("ai_conversations")
ai_messages_repo = Repository("ai_messages")
freelancer_profiles_repo = Repository("freelancer_profiles")
freelancer_skills_repo = Repository("freelancer_skills")
skills_repo = Repository("skills")
freelancer_experience_repo = Repository("freelancer_experience")
freelancer_certifications_repo = Repository("freelancer_certifications")
portfolios_repo = Repository("portfolios")
portfolio_projects_repo = Repository("portfolio_projects")
matching_runs_repo = Repository("matching_runs")
match_scores_repo = Repository("match_scores")
project_candidates_repo = Repository("project_candidates")
phases_repo = Repository("project_phases")
milestones_repo = Repository("milestones")
tasks_repo = Repository("project_tasks")
submissions_repo = Repository("phase_submissions")
evidence_repo = Repository("evidence_items")
verification_reports_repo = Repository("verification_reports")
approvals_repo = Repository("approval_records")
change_requests_repo = Repository("change_requests")
change_conversations_repo = Repository("change_conversations")
change_estimates_repo = Repository("change_estimates")
change_approvals_repo = Repository("change_approvals")
service_requests_repo = Repository("service_requests")
payment_orders_repo = Repository("payment_orders")
payments_repo = Repository("payments")
payment_methods_repo = Repository("payment_methods")
commissions_repo = Repository("platform_commissions")
payouts_repo = Repository("payouts")
certificates_repo = Repository("certificates")
notifications_repo = Repository("notifications")
audit_logs_repo = Repository("audit_logs")
idempotency_repo = Repository("idempotency_keys")
project_documents_repo = Repository("project_documents")
document_versions_repo = Repository("document_versions")
meetings_repo = Repository("meetings")
project_messages_repo = Repository("project_messages")
calendar_events_repo = Repository("calendar_events")
