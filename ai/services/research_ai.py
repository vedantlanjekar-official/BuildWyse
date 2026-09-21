"""Market and technical research AI service."""

from ai.schemas.outputs import ResearchOutput
from ai.services._base import generate_structured


def _stub(user_content: str) -> ResearchOutput:
    return ResearchOutput(
        market_context=f"Research context for: {user_content[:120]}",
        comparable_solutions=["Similar SaaS platforms", "Open-source alternatives"],
        risks=["Scope ambiguity", "Integration complexity"],
        recommendations=["Validate MVP scope", "Prioritize verification workflows"],
    )


def generate(user_content: str, **kwargs) -> ResearchOutput:
    return generate_structured("research.txt", user_content, ResearchOutput, _stub)
