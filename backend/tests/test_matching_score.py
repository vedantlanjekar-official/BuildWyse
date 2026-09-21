"""Unit tests for matching score algorithm."""

from app.services.matching_service import _jaccard, score_freelancer


def test_jaccard_full_overlap():
    assert _jaccard({"python", "fastapi"}, {"python", "fastapi"}) == 1.0


def test_jaccard_no_overlap():
    assert _jaccard({"python"}, {"java"}) == 0.0


def test_score_freelancer_high_match():
    freelancer = {
        "headline": "Python FastAPI expert",
        "experience_years": 6,
        "platform_certified": True,
        "metadata": {"skills": ["Python", "FastAPI", "React"], "identity_verified": True, "interview_passed": True},
    }
    scores = score_freelancer({"python", "fastapi"}, freelancer, requirement_text="Build API with Python FastAPI")
    assert scores["overall_score"] > 60
    assert scores["skills_score"] > 0
    assert scores["verification_score"] >= 75


def test_score_freelancer_low_match():
    freelancer = {
        "headline": "Graphic designer",
        "experience_years": 1,
        "platform_certified": False,
        "metadata": {"skills": ["Photoshop"]},
    }
    scores = score_freelancer({"python", "kubernetes"}, freelancer, include_embedding=False)
    assert scores["overall_score"] < 40


def test_embedding_included_when_text_provided():
    freelancer = {
        "headline": "Backend developer",
        "experience_years": 4,
        "platform_certified": True,
        "metadata": {"skills": ["Python"]},
    }
    scores = score_freelancer({"python"}, freelancer, requirement_text="python backend api", include_embedding=True)
    assert scores["embedding_score"] is not None
