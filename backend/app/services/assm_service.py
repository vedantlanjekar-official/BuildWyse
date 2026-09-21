"""After-Sales Service Module — classifies requests as ASSM vs new project."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from app.repositories.supabase_client import service_requests_repo
from app.services.audit_service import audit_service

# Thresholds — exceeding any triggers NEW_PROJECT classification
SCOPE_EXPANSION_THRESHOLD = 30.0  # percent
EFFORT_HOURS_THRESHOLD = 40.0
MODULES_AFFECTED_THRESHOLD = 3


@dataclass(frozen=True)
class ASSMThresholds:
    scope_expansion_percent: float = SCOPE_EXPANSION_THRESHOLD
    effort_hours: float = EFFORT_HOURS_THRESHOLD
    modules_count: int = MODULES_AFFECTED_THRESHOLD


def classify_service_request(
    *,
    scope_expansion_percent: float,
    estimated_effort_hours: float,
    modules_affected: list[str],
    thresholds: ASSMThresholds | None = None,
) -> dict:
    t = thresholds or ASSMThresholds()
    modules_count = len(modules_affected)
    reasons: list[str] = []

    if scope_expansion_percent > t.scope_expansion_percent:
        reasons.append(f"Scope expansion {scope_expansion_percent}% exceeds {t.scope_expansion_percent}%")
    if estimated_effort_hours > t.effort_hours:
        reasons.append(f"Effort {estimated_effort_hours}h exceeds {t.effort_hours}h")
    if modules_count > t.modules_count:
        reasons.append(f"Modules affected ({modules_count}) exceeds {t.modules_count}")

    if reasons:
        return {
            "classification": "NEW_PROJECT",
            "reason": "; ".join(reasons),
            "thresholds": {
                "scope_expansion_percent": t.scope_expansion_percent,
                "effort_hours": t.effort_hours,
                "modules_count": t.modules_count,
            },
        }

    return {
        "classification": "AFTER_SALES_SERVICE",
        "reason": "Request within after-sales thresholds",
        "thresholds": {
            "scope_expansion_percent": t.scope_expansion_percent,
            "effort_hours": t.effort_hours,
            "modules_count": t.modules_count,
        },
    }


class ASSMService:
    def create_service_request(self, project_id: UUID, user_id: str, data: dict) -> dict:
        classification = classify_service_request(
            scope_expansion_percent=float(data.get("scope_expansion_percent", 0)),
            estimated_effort_hours=float(data.get("estimated_effort_hours", 0)),
            modules_affected=data.get("modules_affected") or [],
        )

        row = service_requests_repo.insert(
            {
                "project_id": str(project_id),
                "requested_by": user_id,
                "title": data["title"],
                "description": (
                    f"{data['description']}\n\n"
                    f"[Classification: {classification['classification']}] "
                    f"{classification.get('reason', '')}"
                ).strip(),
                "service_type": data.get("service_type", "maintenance"),
                "status": "submitted",
                "priority": data.get("priority", "medium"),
            }
        )
        audit_service.log(
            actor_id=user_id,
            action="assm.service_request.create",
            entity_type="service_request",
            entity_id=row["id"],
            project_id=project_id,
            new_values={**row, "classification": classification},
        )
        return {**row, "classification": classification["classification"], "classification_detail": classification}


assm_service = ASSMService()
