"""Project health AI service."""

from ai.schemas.outputs import HealthOutput
from ai.services._base import generate_structured


def _stub(user_content: str) -> HealthOutput:
    return HealthOutput(
        overall_status="at_risk",
        health_score=68.0,
        risks=["Upcoming milestone deadline", "Pending client approvals"],
        recommendations=["Schedule review meeting", "Clarify open change requests"],
    )


def generate(user_content: str, **kwargs) -> HealthOutput:
    return generate_structured("health.txt", user_content, HealthOutput, _stub)
