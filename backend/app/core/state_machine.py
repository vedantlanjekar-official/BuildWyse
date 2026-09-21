"""Server-side project lifecycle state machine."""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field


class ProjectState(str, Enum):
    PROJECT_DISCOVERY = "PROJECT_DISCOVERY"
    REQUIREMENT_DISCUSSION = "REQUIREMENT_DISCUSSION"
    DOCUMENTATION_PREPARATION = "DOCUMENTATION_PREPARATION"
    DOCUMENTATION_REVIEW = "DOCUMENTATION_REVIEW"
    BUDGET_PLANNING = "BUDGET_PLANNING"
    DEVELOPMENT_PREFERENCE = "DEVELOPMENT_PREFERENCE"
    FREELANCER_MATCHING = "FREELANCER_MATCHING"
    FREELANCER_SELECTION = "FREELANCER_SELECTION"
    TECHNICAL_REVIEW = "TECHNICAL_REVIEW"
    CLIENT_FREELANCER_DISCUSSION = "CLIENT_FREELANCER_DISCUSSION"
    AGREEMENT = "AGREEMENT"
    EXECUTION = "EXECUTION"
    PHASE_VERIFICATION = "PHASE_VERIFICATION"
    COMPLETED = "COMPLETED"
    CHANGE_REQUEST = "CHANGE_REQUEST"
    AFTER_SALES = "AFTER_SALES"
    CERTIFIED = "CERTIFIED"


ALLOWED_TRANSITIONS: dict[ProjectState, frozenset[ProjectState]] = {
    ProjectState.PROJECT_DISCOVERY: frozenset({ProjectState.REQUIREMENT_DISCUSSION}),
    ProjectState.REQUIREMENT_DISCUSSION: frozenset(
        {ProjectState.DOCUMENTATION_PREPARATION, ProjectState.PROJECT_DISCOVERY}
    ),
    ProjectState.DOCUMENTATION_PREPARATION: frozenset(
        {ProjectState.DOCUMENTATION_REVIEW, ProjectState.REQUIREMENT_DISCUSSION}
    ),
    ProjectState.DOCUMENTATION_REVIEW: frozenset(
        {ProjectState.BUDGET_PLANNING, ProjectState.DOCUMENTATION_PREPARATION}
    ),
    ProjectState.BUDGET_PLANNING: frozenset(
        {ProjectState.DEVELOPMENT_PREFERENCE, ProjectState.DOCUMENTATION_REVIEW}
    ),
    ProjectState.DEVELOPMENT_PREFERENCE: frozenset(
        {ProjectState.FREELANCER_MATCHING, ProjectState.BUDGET_PLANNING}
    ),
    ProjectState.FREELANCER_MATCHING: frozenset(
        {ProjectState.FREELANCER_SELECTION, ProjectState.DEVELOPMENT_PREFERENCE}
    ),
    ProjectState.FREELANCER_SELECTION: frozenset(
        {ProjectState.TECHNICAL_REVIEW, ProjectState.FREELANCER_MATCHING}
    ),
    ProjectState.TECHNICAL_REVIEW: frozenset(
        {ProjectState.CLIENT_FREELANCER_DISCUSSION, ProjectState.FREELANCER_SELECTION}
    ),
    ProjectState.CLIENT_FREELANCER_DISCUSSION: frozenset(
        {ProjectState.AGREEMENT, ProjectState.TECHNICAL_REVIEW}
    ),
    ProjectState.AGREEMENT: frozenset(
        {ProjectState.EXECUTION, ProjectState.CLIENT_FREELANCER_DISCUSSION}
    ),
    ProjectState.EXECUTION: frozenset(
        {ProjectState.PHASE_VERIFICATION, ProjectState.CHANGE_REQUEST}
    ),
    ProjectState.PHASE_VERIFICATION: frozenset(
        {ProjectState.EXECUTION, ProjectState.COMPLETED}
    ),
    ProjectState.COMPLETED: frozenset(
        {ProjectState.CHANGE_REQUEST, ProjectState.AFTER_SALES, ProjectState.CERTIFIED}
    ),
    ProjectState.CHANGE_REQUEST: frozenset(
        {ProjectState.EXECUTION, ProjectState.PHASE_VERIFICATION, ProjectState.COMPLETED}
    ),
    ProjectState.AFTER_SALES: frozenset(
        {ProjectState.EXECUTION, ProjectState.CHANGE_REQUEST, ProjectState.CERTIFIED}
    ),
    ProjectState.CERTIFIED: frozenset({ProjectState.AFTER_SALES}),
}


class InvalidTransitionError(ValueError):
    """Raised when a state transition is not permitted."""


class ProjectStateMachine:
    """Enforces allowed project state transitions server-side."""

    def __init__(self, initial: ProjectState | str = ProjectState.PROJECT_DISCOVERY) -> None:
        self._state = ProjectState(initial)

    @property
    def state(self) -> ProjectState:
        return self._state

    def allowed_targets(self) -> list[ProjectState]:
        return sorted(ALLOWED_TRANSITIONS.get(self._state, frozenset()), key=lambda s: s.value)

    def can_transition_to(self, target: ProjectState | str) -> bool:
        target_state = ProjectState(target)
        return target_state in ALLOWED_TRANSITIONS.get(self._state, frozenset())

    def transition_to(self, target: ProjectState | str) -> ProjectState:
        target_state = ProjectState(target)
        if not self.can_transition_to(target_state):
            raise InvalidTransitionError(
                f"Transition from {self._state.value} to {target_state.value} is not allowed"
            )
        self._state = target_state
        return self._state

    def force_state(self, state: ProjectState | str) -> None:
        """Admin-only escape hatch; not exposed via public API."""
        self._state = ProjectState(state)


class TransitionRequest(BaseModel):
    target_state: ProjectState
    reason: str | None = None


class TransitionResult(BaseModel):
    previous_state: ProjectState
    current_state: ProjectState
    allowed_next: list[ProjectState] = Field(default_factory=list)
