"""Deterministic freelancer matching with optional embedding similarity."""

from __future__ import annotations

import math
from datetime import datetime, timezone
from uuid import UUID, uuid4

from app.repositories.supabase_client import (
    freelancer_profiles_repo,
    match_scores_repo,
    matching_runs_repo,
    project_candidates_repo,
    projects_repo,
    requirements_repo,
)
from app.services.audit_service import audit_service

ALGORITHM_VERSION = "v1-deterministic"


def _normalize_set(values: list[str]) -> set[str]:
    return {v.strip().lower() for v in values if v and v.strip()}


def _jaccard(a: set[str], b: set[str]) -> float:
    if not a and not b:
        return 0.0
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


def _simple_embedding(text: str, dim: int = 32) -> list[float]:
    """Deterministic pseudo-embedding for stub mode (no network)."""
    vec = [0.0] * dim
    for i, ch in enumerate(text.lower()):
        vec[i % dim] += (ord(ch) % 31) / 31.0
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


def score_freelancer(
    required_skills: set[str],
    freelancer: dict,
    *,
    requirement_text: str = "",
    include_embedding: bool = True,
) -> dict:
    meta = freelancer.get("metadata") or {}
    skills = _normalize_set(meta.get("skills") or [])
    if not skills and freelancer.get("headline"):
        skills = _normalize_set(freelancer["headline"].replace(",", " ").split())

    skills_score = _jaccard(required_skills, skills) * 100.0

    years = float(freelancer.get("experience_years") or 0)
    experience_score = min(100.0, years * 12.0)

    verification_score = 0.0
    if freelancer.get("platform_certified"):
        verification_score += 50.0
    if meta.get("identity_verified"):
        verification_score += 25.0
    if meta.get("interview_passed"):
        verification_score += 25.0
    verification_score = min(100.0, verification_score)

    embedding_score: float | None = None
    weight_skills, weight_exp, weight_ver, weight_emb = 0.45, 0.25, 0.20, 0.10

    if include_embedding and requirement_text:
        req_vec = _simple_embedding(requirement_text)
        fl_vec = _simple_embedding(" ".join(sorted(skills)) + " " + (freelancer.get("headline") or ""))
        embedding_score = _cosine_similarity(req_vec, fl_vec) * 100.0
        overall = (
            skills_score * weight_skills
            + experience_score * weight_exp
            + verification_score * weight_ver
            + embedding_score * weight_emb
        )
    else:
        weight_skills, weight_exp, weight_ver = 0.50, 0.30, 0.20
        overall = skills_score * weight_skills + experience_score * weight_exp + verification_score * weight_ver

    return {
        "skills_score": round(skills_score, 2),
        "experience_score": round(experience_score, 2),
        "verification_score": round(verification_score, 2),
        "embedding_score": round(embedding_score, 2) if embedding_score is not None else None,
        "overall_score": round(overall, 2),
    }


def generate_explanation(scores: dict, freelancer: dict, required_skills: set[str]) -> str:
    meta = freelancer.get("metadata") or {}
    skills = _normalize_set(meta.get("skills") or [])
    overlap = required_skills & skills
    parts = [
        f"Overall match {scores['overall_score']:.0f}/100.",
        f"Skills overlap: {', '.join(sorted(overlap)) or 'none'}.",
        f"Experience score {scores['experience_score']:.0f}, verification {scores['verification_score']:.0f}.",
    ]
    if scores.get("embedding_score") is not None:
        parts.append(f"Semantic similarity {scores['embedding_score']:.0f}.")
    return " ".join(parts)


class MatchingService:
    def run_matching(
        self,
        project_id: UUID,
        actor_id: str,
        *,
        include_embedding: bool = True,
        limit: int = 10,
        ai_explanation: str | None = None,
    ) -> dict:
        project = projects_repo.get(project_id)
        if not project:
            raise LookupError("Project not found")

        reqs = requirements_repo.list(filters={"project_id": str(project_id)}, limit=100)
        required_skills: set[str] = set()
        requirement_text_parts: list[str] = [project.get("description") or "", project.get("title") or ""]
        for req in reqs:
            requirement_text_parts.append(req.get("content") or req.get("title") or "")
            meta = req.get("metadata") or {}
            required_skills |= _normalize_set(meta.get("skills") or [])
        if project.get("category"):
            required_skills.add(project["category"].lower())

        requirement_text = " ".join(requirement_text_parts)

        run = matching_runs_repo.insert(
            {
                "project_id": str(project_id),
                "initiated_by": actor_id,
                "status": "running",
                "algorithm_version": ALGORITHM_VERSION,
                "started_at": datetime.now(timezone.utc).isoformat(),
            }
        )

        freelancers = freelancer_profiles_repo.list(limit=200)
        scored: list[tuple[dict, dict]] = []
        for fl in freelancers:
            scores = score_freelancer(
                required_skills,
                fl,
                requirement_text=requirement_text,
                include_embedding=include_embedding,
            )
            scored.append((fl, scores))

        scored.sort(key=lambda x: x[1]["overall_score"], reverse=True)
        top = scored[:limit]

        # UNIQUE(project_id, freelancer_id) blocks re-runs unless we clear/replace the shortlist.
        project_candidates_repo.delete_where({"project_id": str(project_id)})

        candidates = []
        for rank, (fl, scores) in enumerate(top, start=1):
            explanation = ai_explanation or generate_explanation(scores, fl, required_skills)
            match_scores_repo.insert(
                {
                    "matching_run_id": run["id"],
                    "freelancer_id": fl["id"],
                    "overall_score": scores["overall_score"],
                    "technology_score": scores["skills_score"],
                    "experience_score": scores["experience_score"],
                    "verification_score": scores["verification_score"],
                    "rank_position": rank,
                    "metadata": {"embedding_score": scores.get("embedding_score"), "explanation": explanation},
                }
            )
            candidate_row = project_candidates_repo.insert(
                {
                    "project_id": str(project_id),
                    "matching_run_id": run["id"],
                    "freelancer_id": fl["id"],
                    "status": "shortlisted",
                    "rank_position": rank,
                    "presented_to_client": True,
                }
            )
            # Guard against silent memory-fallback: ensure we persist the new run link.
            if candidate_row and str(candidate_row.get("matching_run_id") or "") != str(run["id"]):
                project_candidates_repo.update(
                    candidate_row["id"],
                    {
                        "matching_run_id": run["id"],
                        "rank_position": rank,
                        "status": "shortlisted",
                        "presented_to_client": True,
                    },
                )
            candidates.append(
                {
                    "freelancer_id": fl["id"],
                    "user_id": fl["user_id"],
                    "headline": fl.get("headline"),
                    "rank": rank,
                    "scores": scores,
                    "explanation": explanation,
                }
            )

        matching_runs_repo.update(
            run["id"],
            {
                "status": "completed",
                "candidate_count": len(candidates),
                "completed_at": datetime.now(timezone.utc).isoformat(),
            },
        )

        audit_service.log(
            actor_id=actor_id,
            action="matching.run",
            entity_type="matching_run",
            entity_id=run["id"],
            project_id=project_id,
            new_values={"candidate_count": len(candidates)},
        )

        return {
            "matching_run_id": run["id"],
            "project_id": str(project_id),
            "candidates": candidates,
            "algorithm_version": ALGORITHM_VERSION,
            "completed_at": datetime.now(timezone.utc),
        }


matching_service = MatchingService()
