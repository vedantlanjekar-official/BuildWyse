"""Submission verification AI service."""

from ai.schemas.outputs import VerificationOutput
from ai.services._base import generate_structured


def _stub(user_content: str) -> VerificationOutput:
    return VerificationOutput(
        overall_result="partial",
        compliance_score=72.0,
        findings=["Core deliverables present", "Some acceptance criteria need manual review"],
        passed_criteria=["Repository linked", "Deployment URL provided"],
        failed_criteria=["Test coverage evidence incomplete"],
    )


def generate(user_content: str, **kwargs) -> VerificationOutput:
    return generate_structured("verification.txt", user_content, VerificationOutput, _stub)
