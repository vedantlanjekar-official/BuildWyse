"""Requirement discovery AI service."""

from ai.schemas.outputs import RequirementOutput
from ai.services._base import generate_structured


def _stub(user_content: str) -> RequirementOutput:
    words = user_content.split()[:12]
    summary = " ".join(words) if words else "Initial project idea captured."
    return RequirementOutput(
        summary=summary,
        functional_requirements=[
            "User authentication and profile management",
            "Core workflow aligned with client description",
        ],
        non_functional_requirements=["Secure API access", "Audit logging"],
        suggested_technologies=["Python", "FastAPI", "React", "PostgreSQL"],
        open_questions=["What is the target launch timeline?", "Any compliance requirements?"],
        confidence=0.75,
    )


def generate(user_content: str, **kwargs) -> RequirementOutput:
    return generate_structured("requirement_discovery.txt", user_content, RequirementOutput, _stub)
