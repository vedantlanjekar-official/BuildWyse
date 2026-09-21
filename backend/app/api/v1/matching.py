"""Matching endpoints."""

from uuid import UUID

from ai.services import matching_ai
from fastapi import APIRouter, Depends, HTTPException

from app.core.security import AuthUser
from app.dependencies.auth import get_current_user
from app.repositories.supabase_client import (
    freelancer_profiles_repo,
    match_scores_repo,
    matching_runs_repo,
    profiles_repo,
    project_candidates_repo,
    projects_repo,
)
from app.schemas.matching import CandidateSelectRequest, MatchingRunRequest, MatchingRunResponse
from app.services.matching_service import matching_service
from app.services.project_service import project_service

router = APIRouter()


def _scores_from_match_row(score_row: dict | None) -> dict:
    if not score_row:
        return {}
    meta = score_row.get("metadata") or {}
    return {
        "overall_score": float(score_row["overall_score"]) if score_row.get("overall_score") is not None else None,
        "skills_score": float(score_row["technology_score"]) if score_row.get("technology_score") is not None else None,
        "experience_score": float(score_row["experience_score"]) if score_row.get("experience_score") is not None else None,
        "verification_score": float(score_row["verification_score"]) if score_row.get("verification_score") is not None else None,
        "embedding_score": meta.get("embedding_score"),
        "explanation": meta.get("explanation"),
    }


@router.get("/projects/{project_id}/results")
async def get_matching_results(project_id: UUID, user: AuthUser = Depends(get_current_user)):
    project_service.get_project(project_id, user)
    runs = matching_runs_repo.list(
        filters={"project_id": str(project_id), "status": "completed"},
        limit=100,
    )
    if not runs:
        return {"matching_run": None, "candidates": []}

    runs.sort(key=lambda r: r.get("completed_at") or r.get("created_at") or "", reverse=True)
    run = runs[0]
    run_id = str(run["id"])

    candidates = project_candidates_repo.list(filters={"matching_run_id": run_id}, limit=100)
    # Fallback: older shortlist rows may still be keyed by project after a failed re-run write.
    if not candidates:
        candidates = project_candidates_repo.list(filters={"project_id": str(project_id)}, limit=100)

    candidates.sort(key=lambda c: c.get("rank_position") or 999)

    score_rows = match_scores_repo.list(filters={"matching_run_id": run_id}, limit=100)
    if not score_rows:
        # Fall back to any scores for freelancers on this shortlist from older runs.
        score_rows = []
        for older in runs[:5]:
            score_rows.extend(match_scores_repo.list(filters={"matching_run_id": str(older["id"])}, limit=100))
    scores_by_freelancer = {str(s["freelancer_id"]): s for s in score_rows}

    enriched = []
    for candidate in candidates:
        freelancer_id = str(candidate["freelancer_id"])
        profile = freelancer_profiles_repo.get(freelancer_id) or {}
        # If get-by-id fails (rare), try list scan.
        if not profile:
            all_fps = freelancer_profiles_repo.list(limit=500)
            profile = next((p for p in all_fps if str(p.get("id")) == freelancer_id), {}) or {}
        meta = profile.get("metadata") or {}
        scores = _scores_from_match_row(scores_by_freelancer.get(freelancer_id))
        user = profiles_repo.get(profile.get("user_id")) if profile.get("user_id") else {}
        user = user or {}
        enriched.append(
            {
                "freelancer_id": freelancer_id,
                "user_id": profile.get("user_id"),
                "full_name": user.get("full_name"),
                "avatar_url": user.get("avatar_url"),
                "email": user.get("email"),
                "headline": profile.get("headline") or "Freelancer",
                "bio": profile.get("bio") or meta.get("bio") or meta.get("summary"),
                "experience_years": profile.get("experience_years"),
                "hourly_rate": profile.get("hourly_rate"),
                "currency": profile.get("currency") or "INR",
                "availability_status": profile.get("availability_status"),
                "github_url": profile.get("github_url"),
                "linkedin_url": profile.get("linkedin_url"),
                "website_url": profile.get("website_url"),
                "skills": meta.get("skills") or [],
                "platform_certified": profile.get("platform_certified"),
                "interview_status": profile.get("interview_status"),
                "rank": candidate.get("rank_position"),
                "status": candidate.get("status"),
                "scores": scores,
                "overall_score": scores.get("overall_score"),
                "explanation": scores.get("explanation"),
                "metadata": meta,
            }
        )

    return {"matching_run": run, "candidates": enriched}


@router.post("/run", response_model=MatchingRunResponse)
async def run_matching(body: MatchingRunRequest, user: AuthUser = Depends(get_current_user)):
    project_service.get_project(body.project_id, user)
    result = matching_service.run_matching(
        body.project_id,
        user.id,
        include_embedding=body.include_embedding,
        limit=body.limit,
    )
    return MatchingRunResponse(
        matching_run_id=UUID(str(result["matching_run_id"])),
        project_id=body.project_id,
        candidates=[
            {
                "freelancer_id": UUID(str(c["freelancer_id"])),
                "user_id": UUID(str(c["user_id"])),
                "headline": c.get("headline"),
                "rank": c["rank"],
                "scores": c["scores"],
                "explanation": c["explanation"],
            }
            for c in result["candidates"]
        ],
        algorithm_version=result["algorithm_version"],
        completed_at=result["completed_at"],
    )


@router.post("/projects/{project_id}/select")
async def select_candidate(
    project_id: UUID,
    body: CandidateSelectRequest,
    user: AuthUser = Depends(get_current_user),
):
    from app.core.state_machine import ProjectState
    from app.repositories.supabase_client import freelancer_profiles_repo

    project = project_service.get_project(project_id, user)

    # body.freelancer_id may be freelancer_profiles.id — map to profile user_id for FK
    profile_id = str(body.freelancer_id)
    fp = freelancer_profiles_repo.get(body.freelancer_id)
    if fp and fp.get("user_id"):
        profile_id = str(fp["user_id"])
    else:
        # maybe already a profile id
        from app.repositories.supabase_client import profiles_repo

        if not profiles_repo.get(body.freelancer_id):
            raise HTTPException(status_code=404, detail="Freelancer not found")

    projects_repo.update(
        project_id,
        {
            "assigned_freelancer_id": profile_id,
            "metadata": {
                **(project.get("metadata") or {}),
                "selection_reason": body.selection_reason,
                "selected_freelancer_profile_id": str(body.freelancer_id),
            },
        },
    )
    if project.get("state") == ProjectState.FREELANCER_MATCHING.value:
        project_service.transition(
            project_id, user, ProjectState.FREELANCER_SELECTION, body.selection_reason
        )
    updated = projects_repo.get(project_id)
    explanation = matching_ai.generate(
        f"Selected freelancer for project {project.get('title')}",
        freelancer_id=str(body.freelancer_id),
    )
    return {"project": updated, "ai_explanation": explanation.model_dump()}
