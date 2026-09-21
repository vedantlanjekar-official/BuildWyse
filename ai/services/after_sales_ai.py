"""After-sales service analysis AI service."""

from ai.schemas.outputs import AfterSalesOutput
from ai.services._base import generate_structured


def _stub(user_content: str) -> AfterSalesOutput:
    return AfterSalesOutput(
        classification="AFTER_SALES_SERVICE",
        reason="Request appears to be maintenance-scale within existing project scope.",
        suggested_actions=["Assign original freelancer", "Create service phases", "Estimate effort"],
    )


def generate(user_content: str, **kwargs) -> AfterSalesOutput:
    return generate_structured("after_sales.txt", user_content, AfterSalesOutput, _stub)
