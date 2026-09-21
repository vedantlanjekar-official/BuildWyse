"""Matching explanation AI service."""

from ai.schemas.outputs import MatchingExplanationOutput
from ai.services._base import generate_structured


def _stub(user_content: str) -> MatchingExplanationOutput:
    return MatchingExplanationOutput(
        freelancer_id="unknown",
        overall_fit="Strong alignment on core technologies with verified platform credentials.",
        strengths=["Skills overlap", "Verified profile", "Relevant experience"],
        gaps=["May need domain-specific portfolio review"],
        recommendation="Consider for shortlist interview.",
    )


def generate(user_content: str, freelancer_id: str = "unknown", **kwargs) -> MatchingExplanationOutput:
    def stub_fn(content: str) -> MatchingExplanationOutput:
        result = _stub(content)
        result.freelancer_id = freelancer_id
        return result

    return generate_structured("matching.txt", user_content, MatchingExplanationOutput, stub_fn)
