"""Unit tests for project state machine."""

import pytest

from app.core.state_machine import InvalidTransitionError, ProjectState, ProjectStateMachine


def test_initial_state():
    sm = ProjectStateMachine()
    assert sm.state == ProjectState.PROJECT_DISCOVERY


def test_valid_forward_transition():
    sm = ProjectStateMachine()
    sm.transition_to(ProjectState.REQUIREMENT_DISCUSSION)
    assert sm.state == ProjectState.REQUIREMENT_DISCUSSION


def test_full_happy_path_to_execution():
    sm = ProjectStateMachine()
    path = [
        ProjectState.REQUIREMENT_DISCUSSION,
        ProjectState.DOCUMENTATION_PREPARATION,
        ProjectState.DOCUMENTATION_REVIEW,
        ProjectState.BUDGET_PLANNING,
        ProjectState.DEVELOPMENT_PREFERENCE,
        ProjectState.FREELANCER_MATCHING,
        ProjectState.FREELANCER_SELECTION,
        ProjectState.TECHNICAL_REVIEW,
        ProjectState.CLIENT_FREELANCER_DISCUSSION,
        ProjectState.AGREEMENT,
        ProjectState.EXECUTION,
    ]
    for state in path:
        sm.transition_to(state)
    assert sm.state == ProjectState.EXECUTION


def test_invalid_skip_transition():
    sm = ProjectStateMachine()
    with pytest.raises(InvalidTransitionError):
        sm.transition_to(ProjectState.EXECUTION)


def test_completed_to_certified():
    sm = ProjectStateMachine(ProjectState.COMPLETED)
    sm.transition_to(ProjectState.CERTIFIED)
    assert sm.state == ProjectState.CERTIFIED


def test_change_request_returns_to_execution():
    sm = ProjectStateMachine(ProjectState.CHANGE_REQUEST)
    sm.transition_to(ProjectState.EXECUTION)
    assert sm.state == ProjectState.EXECUTION


def test_allowed_targets_non_empty():
    sm = ProjectStateMachine()
    targets = sm.allowed_targets()
    assert ProjectState.REQUIREMENT_DISCUSSION in targets
