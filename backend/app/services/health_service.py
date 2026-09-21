"""Project health assessment service."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from app.repositories.supabase_client import milestones_repo, phases_repo, projects_repo, submissions_repo


class HealthService:
    def assess_project(self, project_id: UUID) -> dict:
        project = projects_repo.get(project_id)
        if not project:
            raise LookupError("Project not found")

        phases = phases_repo.list(filters={"project_id": str(project_id)}, limit=100)
        milestones = milestones_repo.list(filters={"project_id": str(project_id)}, limit=200)
        submissions = submissions_repo.list(filters={"project_id": str(project_id)}, limit=100)

        total_phases = len(phases)
        approved_phases = sum(1 for p in phases if p.get("status") == "approved")
        rejected_submissions = sum(1 for s in submissions if s.get("status") == "rejected")
        overdue_milestones = 0  # simplified without date parsing edge cases

        score = 100.0
        if total_phases:
            completion_ratio = approved_phases / total_phases
            score = max(20.0, completion_ratio * 100.0)
        score -= rejected_submissions * 5
        score -= overdue_milestones * 3
        score = max(0.0, min(100.0, score))

        if score >= 75:
            status = "healthy"
        elif score >= 50:
            status = "at_risk"
        elif score >= 25:
            status = "critical"
        else:
            status = "blocked"

        return {
            "project_id": str(project_id),
            "overall_status": status,
            "health_score": round(score, 2),
            "metrics": {
                "total_phases": total_phases,
                "approved_phases": approved_phases,
                "rejected_submissions": rejected_submissions,
                "total_milestones": len(milestones),
            },
            "last_assessed_at": datetime.now(timezone.utc).isoformat(),
        }


health_service = HealthService()
