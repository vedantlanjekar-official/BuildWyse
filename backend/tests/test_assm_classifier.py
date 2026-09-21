"""Unit tests for ASSM classifier."""

from app.services.assm_service import (
    ASSMThresholds,
    EFFORT_HOURS_THRESHOLD,
    MODULES_AFFECTED_THRESHOLD,
    SCOPE_EXPANSION_THRESHOLD,
    classify_service_request,
)


def test_after_sales_within_thresholds():
    result = classify_service_request(
        scope_expansion_percent=10,
        estimated_effort_hours=8,
        modules_affected=["auth"],
    )
    assert result["classification"] == "AFTER_SALES_SERVICE"


def test_new_project_scope_expansion():
    result = classify_service_request(
        scope_expansion_percent=SCOPE_EXPANSION_THRESHOLD + 5,
        estimated_effort_hours=5,
        modules_affected=["auth"],
    )
    assert result["classification"] == "NEW_PROJECT"
    assert "Scope expansion" in result["reason"]


def test_new_project_effort():
    result = classify_service_request(
        scope_expansion_percent=5,
        estimated_effort_hours=EFFORT_HOURS_THRESHOLD + 10,
        modules_affected=["auth"],
    )
    assert result["classification"] == "NEW_PROJECT"
    assert "Effort" in result["reason"]


def test_new_project_modules():
    modules = [f"module_{i}" for i in range(MODULES_AFFECTED_THRESHOLD + 1)]
    result = classify_service_request(
        scope_expansion_percent=5,
        estimated_effort_hours=5,
        modules_affected=modules,
    )
    assert result["classification"] == "NEW_PROJECT"
    assert "Modules affected" in result["reason"]


def test_custom_thresholds():
    result = classify_service_request(
        scope_expansion_percent=20,
        estimated_effort_hours=20,
        modules_affected=["a", "b"],
        thresholds=ASSMThresholds(scope_expansion_percent=50, effort_hours=50, modules_count=5),
    )
    assert result["classification"] == "AFTER_SALES_SERVICE"
