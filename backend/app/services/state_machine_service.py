"""Project state transition service."""

from __future__ import annotations

from uuid import UUID

from app.core.security import AuthUser
from app.core.state_machine import InvalidTransitionError, ProjectState, ProjectStateMachine, TransitionResult
from app.repositories.supabase_client import projects_repo
from app.services.audit_service import audit_service


class StateMachineService:
    def get_machine_for_project(self, project_id: UUID) -> tuple[dict, ProjectStateMachine]:
        project = projects_repo.get(project_id)
        if not project:
            raise LookupError("Project not found")
        machine = ProjectStateMachine(project["state"])
        return project, machine

    def transition(
        self,
        project_id: UUID,
        target_state: ProjectState | str,
        actor: AuthUser,
        reason: str | None = None,
    ) -> TransitionResult:
        project, machine = self.get_machine_for_project(project_id)
        previous = machine.state
        try:
            machine.transition_to(target_state)
        except InvalidTransitionError:
            raise

        updated = projects_repo.update(
            project_id,
            {"state": machine.state.value, "metadata": {**(project.get("metadata") or {}), "last_transition_reason": reason}},
        )
        audit_service.log(
            actor_id=actor.id,
            action="project.state_transition",
            entity_type="project",
            entity_id=project_id,
            project_id=project_id,
            old_values={"state": previous.value},
            new_values={"state": machine.state.value, "reason": reason},
        )
        return TransitionResult(
            previous_state=previous,
            current_state=machine.state,
            allowed_next=machine.allowed_targets(),
        )


state_machine_service = StateMachineService()
