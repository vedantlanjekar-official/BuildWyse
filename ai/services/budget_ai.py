"""Budget estimation AI service."""

from ai.schemas.outputs import BudgetOutput
from ai.services._base import generate_structured


def _stub(user_content: str) -> BudgetOutput:
    complexity = max(1, len(user_content.split()))
    base = max(50000, complexity * 2500)
    individual_min = float(base * 0.75)
    individual_max = float(base * 1.15)
    team_min = float(base * 1.1)
    team_max = float(base * 1.65)
    enterprise_min = float(base * 1.55)
    enterprise_max = float(base * 2.4)
    return BudgetOutput(
        estimated_min=individual_min,
        estimated_max=enterprise_max,
        currency="INR",
        breakdown=[
            {"phase": "Discovery & Documentation", "amount": round(base * 0.15, 2)},
            {"phase": "Design & Build", "amount": round(base * 0.55, 2)},
            {"phase": "QA, Verification & Launch", "amount": round(base * 0.20, 2)},
            {"phase": "Contingency", "amount": round(base * 0.10, 2)},
        ],
        rationale=(
            "Stub estimate derived from project/requirements context length and typical BuildWyse "
            "delivery phases across individual, team, and enterprise models."
        ),
        individual_min=individual_min,
        individual_max=individual_max,
        individual_summary="Best for focused scope with a single specialist owning design-to-delivery.",
        team_min=team_min,
        team_max=team_max,
        team_summary="Best when parallel workstreams (design, frontend, backend) need coordinated specialists.",
        enterprise_min=enterprise_min,
        enterprise_max=enterprise_max,
        enterprise_summary="Best for compliance-heavy, multi-stakeholder, or high-availability delivery needs.",
    )


def generate(user_content: str, **kwargs) -> BudgetOutput:
    return generate_structured("budget.txt", user_content, BudgetOutput, _stub)
