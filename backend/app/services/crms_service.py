"""Change Request Management System service."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from app.repositories.supabase_client import (
    change_approvals_repo,
    change_conversations_repo,
    change_estimates_repo,
    change_requests_repo,
    profiles_repo,
    projects_repo,
)
from app.services.audit_service import audit_service
from app.services.notification_service import notification_service


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _profile_name(user_id: str | None) -> str | None:
    if not user_id:
        return None
    profile = profiles_repo.get(user_id) or {}
    return profile.get("full_name") or profile.get("email")


class CRMSService:
    def create_change_request(self, project_id: UUID, user_id: str, data: dict) -> dict:
        project = projects_repo.get(project_id)
        if not project:
            raise LookupError("Project not found")

        row = change_requests_repo.insert(
            {
                "project_id": str(project_id),
                "requested_by": user_id,
                "title": data["title"],
                "description": data["description"],
                "change_type": data.get("change_type", "scope"),
                "status": "submitted",
                "priority": data.get("priority", "medium"),
            }
        )

        current = project.get("state")
        if current != "CHANGE_REQUEST":
            projects_repo.update(project_id, {"state": "CHANGE_REQUEST"})

        # Notify assigned freelancer if present
        assigned = project.get("assigned_freelancer_id")
        if assigned:
            notification_service.notify(
                user_id=str(assigned),
                notification_type="change_request.submitted",
                title=f"Change request: {data['title']}",
                body=data["description"][:200],
                project_id=project_id,
            )

        notification_service.notify(
            user_id=str(project.get("client_id")),
            notification_type="change_request.submitted",
            title=f"Change request: {data['title']}",
            body=data["description"][:200],
            project_id=project_id,
        )

        audit_service.log(
            actor_id=user_id,
            action="crms.change_request.create",
            entity_type="change_request",
            entity_id=row["id"],
            project_id=project_id,
            new_values=row,
        )
        return self.get_detail(UUID(str(row["id"])))

    def list_for_project(self, project_id: UUID) -> list[dict]:
        rows = change_requests_repo.list(filters={"project_id": str(project_id)}, limit=100)
        return [self._enrich(r) for r in rows]

    def get_detail(self, change_id: UUID) -> dict:
        row = change_requests_repo.get(change_id)
        if not row:
            raise LookupError("Change request not found")
        return self._enrich(row, include_children=True)

    def _enrich(self, row: dict, *, include_children: bool = True) -> dict:
        change_id = str(row["id"])
        comments = change_conversations_repo.list(filters={"change_request_id": change_id}, limit=100)
        comments.sort(key=lambda c: c.get("created_at") or "")
        estimates = change_estimates_repo.list(filters={"change_request_id": change_id}, limit=50)
        estimates.sort(key=lambda e: e.get("created_at") or "", reverse=True)
        approvals = change_approvals_repo.list(filters={"change_request_id": change_id}, limit=50)
        approvals.sort(key=lambda a: a.get("created_at") or "")

        freelancer_comments = [
            {
                **c,
                "author_name": _profile_name(str(c.get("user_id")) if c.get("user_id") else None),
            }
            for c in comments
            if c.get("message_type") == "comment"
        ]
        latest_estimate = estimates[0] if estimates else None
        if latest_estimate:
            latest_estimate = {
                **latest_estimate,
                "estimated_by_name": _profile_name(
                    str(latest_estimate.get("estimated_by")) if latest_estimate.get("estimated_by") else None
                ),
            }

        client_approval = next((a for a in reversed(approvals) if a.get("approval_type") == "client"), None)
        freelancer_approval = next(
            (a for a in reversed(approvals) if a.get("approval_type") == "freelancer"), None
        )

        enriched = {
            **row,
            "requested_by_name": _profile_name(str(row.get("requested_by")) if row.get("requested_by") else None),
            "freelancer_comment": freelancer_comments[-1]["message"] if freelancer_comments else None,
            "freelancer_comment_at": freelancer_comments[-1].get("created_at") if freelancer_comments else None,
            "budget_amount": latest_estimate.get("estimated_amount") if latest_estimate else None,
            "budget_currency": latest_estimate.get("currency") if latest_estimate else None,
            "budget_days": latest_estimate.get("estimated_days") if latest_estimate else None,
            "budget_status": latest_estimate.get("status") if latest_estimate else None,
            "client_approval_status": (client_approval or {}).get("status"),
            "client_approved_at": (client_approval or {}).get("decided_at"),
            "freelancer_approval_status": (freelancer_approval or {}).get("status"),
            "freelancer_approved_at": (freelancer_approval or {}).get("decided_at"),
        }
        if include_children:
            enriched["comments"] = freelancer_comments
            enriched["estimates"] = [
                {
                    **e,
                    "estimated_by_name": _profile_name(str(e.get("estimated_by")) if e.get("estimated_by") else None),
                }
                for e in estimates
            ]
            enriched["approvals"] = [
                {
                    **a,
                    "approved_by_name": _profile_name(str(a.get("approved_by")) if a.get("approved_by") else None),
                }
                for a in approvals
            ]
            enriched["timeline"] = self._timeline(enriched)
        return enriched

    def _timeline(self, detail: dict) -> list[dict]:
        events: list[dict] = [
            {
                "type": "created",
                "label": "Change request raised",
                "at": detail.get("created_at"),
                "by": detail.get("requested_by_name"),
            }
        ]
        for c in detail.get("comments") or []:
            events.append(
                {
                    "type": "comment",
                    "label": "Freelancer comment",
                    "at": c.get("created_at"),
                    "by": c.get("author_name"),
                    "detail": c.get("message"),
                }
            )
        for e in detail.get("estimates") or []:
            events.append(
                {
                    "type": "budget",
                    "label": "Budget estimate",
                    "at": e.get("created_at"),
                    "by": e.get("estimated_by_name"),
                    "detail": f"{e.get('currency', 'INR')} {e.get('estimated_amount')}",
                }
            )
        for a in detail.get("approvals") or []:
            events.append(
                {
                    "type": "approval",
                    "label": f"{str(a.get('approval_type', '')).title()} {a.get('status')}",
                    "at": a.get("decided_at") or a.get("created_at"),
                    "by": a.get("approved_by_name"),
                    "detail": a.get("notes"),
                }
            )
        events.sort(key=lambda x: x.get("at") or "")
        return events

    def add_freelancer_response(
        self,
        change_id: UUID,
        user_id: str,
        *,
        comment: str,
        budget_amount: float,
        currency: str = "INR",
        estimated_days: int | None = None,
    ) -> dict:
        row = change_requests_repo.get(change_id)
        if not row:
            raise LookupError("Change request not found")

        change_conversations_repo.insert(
            {
                "change_request_id": str(change_id),
                "user_id": user_id,
                "message": comment,
                "message_type": "comment",
                "created_at": _now(),
            }
        )
        change_estimates_repo.insert(
            {
                "change_request_id": str(change_id),
                "estimated_by": user_id,
                "estimated_amount": budget_amount,
                "currency": currency,
                "estimated_days": estimated_days,
                "breakdown": {},
                "status": "proposed",
                "created_at": _now(),
                "updated_at": _now(),
            }
        )
        # Freelancer approval stamp when they submit budget/comment
        self._upsert_approval(change_id, user_id, "freelancer", "approved", notes="Budget and comment submitted")
        change_requests_repo.update(change_id, {"status": "pending_approval", "updated_at": _now()})

        project = projects_repo.get(row.get("project_id")) or {}
        notification_service.notify(
            user_id=str(project.get("client_id")),
            notification_type="change_request.estimated",
            title=f"Budget ready: {row.get('title')}",
            body=comment[:200],
            project_id=row.get("project_id"),
        )
        return self.get_detail(change_id)

    def approve(
        self,
        change_id: UUID,
        user_id: str,
        *,
        approval_type: str,
        status: str = "approved",
        notes: str | None = None,
    ) -> dict:
        row = change_requests_repo.get(change_id)
        if not row:
            raise LookupError("Change request not found")
        if approval_type not in {"client", "freelancer"}:
            raise ValueError("approval_type must be client or freelancer")
        if status not in {"approved", "rejected", "pending"}:
            raise ValueError("Invalid approval status")

        self._upsert_approval(change_id, user_id, approval_type, status, notes=notes)

        detail = self.get_detail(change_id)
        client_ok = detail.get("client_approval_status") == "approved"
        freelancer_ok = detail.get("freelancer_approval_status") == "approved"
        if status == "rejected":
            change_requests_repo.update(change_id, {"status": "rejected", "updated_at": _now()})
        elif client_ok and freelancer_ok:
            change_requests_repo.update(change_id, {"status": "approved", "updated_at": _now()})
        elif client_ok or freelancer_ok:
            change_requests_repo.update(change_id, {"status": "pending_approval", "updated_at": _now()})

        return self.get_detail(change_id)

    def _upsert_approval(
        self,
        change_id: UUID,
        user_id: str,
        approval_type: str,
        status: str,
        notes: str | None = None,
    ) -> dict:
        existing = change_approvals_repo.list(
            filters={"change_request_id": str(change_id), "approval_type": approval_type},
            limit=10,
        )
        payload = {
            "change_request_id": str(change_id),
            "approved_by": user_id,
            "approval_type": approval_type,
            "status": status,
            "notes": notes,
            "decided_at": _now() if status in {"approved", "rejected"} else None,
            "updated_at": _now(),
        }
        if existing:
            return change_approvals_repo.update(existing[-1]["id"], payload) or existing[-1]
        return change_approvals_repo.insert({**payload, "created_at": _now()})


crms_service = CRMSService()
