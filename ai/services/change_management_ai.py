"""Change request analysis AI service."""

from ai.schemas.outputs import ChangeManagementOutput
from ai.services._base import generate_structured


def _stub(user_content: str) -> ChangeManagementOutput:
    return ChangeManagementOutput(
        impact_summary="Moderate scope expansion affecting timeline and budget.",
        scope_changes=["Additional feature module", "Updated API contracts"],
        estimated_cost_delta=15000.0,
        estimated_timeline_delta_days=14,
        recommendation="Approve with revised milestone plan.",
    )


def generate(user_content: str, **kwargs) -> ChangeManagementOutput:
    return generate_structured("change_management.txt", user_content, ChangeManagementOutput, _stub)
