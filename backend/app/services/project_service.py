"""Project CRUD and lifecycle operations."""

from __future__ import annotations

import logging
from uuid import UUID

from app.core.security import AuthUser, Role
from app.core.state_machine import ProjectState
from app.repositories.supabase_client import Repository, projects_repo
from app.services.audit_service import audit_service
from app.services.state_machine_service import state_machine_service

logger = logging.getLogger(__name__)


class ProjectAccessError(PermissionError):
    pass


class ProjectDeleteError(RuntimeError):
    pass


# Tables that RESTRICT project deletion (must be cleared first, leaf → root).
_RESTRICT_CHILD_TABLES = (
    "refunds",
    "platform_commissions",
    "milestone_payments",
    "invoices",
    "payouts",
    "payments",
    "payment_orders",
    "certificates",
)


class ProjectService:
    def _can_access(self, project: dict, user: AuthUser) -> bool:
        if user.is_admin:
            return True
        if str(project.get("client_id")) == user.id:
            return True
        if project.get("assigned_freelancer_id") and str(project["assigned_freelancer_id"]) == user.id:
            return True
        return user.has_role(Role.TEAM_LEADER, Role.ENTERPRISE_MANAGER)

    def list_projects(self, user: AuthUser, *, limit: int = 50, offset: int = 0) -> list[dict]:
        if user.is_admin:
            return projects_repo.list(limit=limit, offset=offset)
        all_projects = projects_repo.list(limit=500)
        return [p for p in all_projects if self._can_access(p, user)][offset : offset + limit]

    def get_project(self, project_id: UUID, user: AuthUser) -> dict:
        project = projects_repo.get(project_id)
        if not project:
            raise LookupError("Project not found")
        if not self._can_access(project, user):
            raise ProjectAccessError("Access denied")
        return project

    def create_project(self, user: AuthUser, data: dict) -> dict:
        row = projects_repo.insert(
            {
                "client_id": user.id,
                "title": data["title"],
                "description": data.get("description"),
                "category": data.get("category"),
                "industry": data.get("industry"),
                "complexity": data.get("complexity"),
                "state": ProjectState.PROJECT_DISCOVERY.value,
                "currency": "INR",
                "metadata": {},
            }
        )
        audit_service.log(
            actor_id=user.id,
            action="project.create",
            entity_type="project",
            entity_id=row["id"],
            project_id=row["id"],
            new_values=row,
        )
        return row

    def update_project(self, project_id: UUID, user: AuthUser, data: dict) -> dict:
        project = self.get_project(project_id, user)
        patch = {k: v for k, v in data.items() if v is not None and k != "state"}
        updated = projects_repo.update(project_id, patch)
        audit_service.log(
            actor_id=user.id,
            action="project.update",
            entity_type="project",
            entity_id=project_id,
            project_id=project_id,
            old_values=project,
            new_values=updated,
        )
        return updated or project

    def transition(self, project_id: UUID, user: AuthUser, target_state: ProjectState, reason: str | None = None):
        self.get_project(project_id, user)
        return state_machine_service.transition(project_id, target_state, user, reason)

    def _purge_restricting_children(self, project_id: UUID) -> None:
        filters = {"project_id": str(project_id)}
        for table in _RESTRICT_CHILD_TABLES:
            try:
                Repository(table).delete_where(filters, strict=True)
            except Exception as exc:
                logger.warning("Failed clearing %s for project %s: %s", table, project_id, exc)
                raise ProjectDeleteError(
                    f"Could not remove related {table.replace('_', ' ')} records before deleting the project."
                ) from exc

    def delete_project(self, project_id: UUID, user: AuthUser) -> None:
        project = self.get_project(project_id, user)
        is_owner = str(project.get("client_id")) == str(user.id)
        if not user.is_admin and not is_owner:
            raise ProjectAccessError("Only the project owner can delete this project")

        self._purge_restricting_children(project_id)

        try:
            projects_repo.delete(project_id, strict=True)
        except Exception as exc:
            logger.exception("Project delete failed for %s", project_id)
            raise ProjectDeleteError(
                "Could not delete this project because related records still block removal."
            ) from exc

        if projects_repo.get(project_id):
            raise ProjectDeleteError("Project delete did not persist. Please try again.")

        audit_service.log(
            actor_id=user.id,
            action="project.delete",
            entity_type="project",
            entity_id=project_id,
            project_id=project_id,
            old_values=project,
        )


project_service = ProjectService()
