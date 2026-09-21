"""Freelancer endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.core.security import AuthUser
from app.dependencies.auth import get_current_user
from app.repositories.supabase_client import (
    freelancer_certifications_repo,
    freelancer_experience_repo,
    freelancer_profiles_repo,
    freelancer_skills_repo,
    portfolio_projects_repo,
    portfolios_repo,
    profiles_repo,
    skills_repo,
)

router = APIRouter()


def _skill_name(row: dict) -> str | None:
    if row.get("skill_name"):
        return str(row["skill_name"])
    skill_id = row.get("skill_id")
    if skill_id:
        skill = skills_repo.get(skill_id) or {}
        return skill.get("name")
    return None


def serialize_freelancer_detail(profile: dict) -> dict:
    freelancer_id = str(profile["id"])
    user = profiles_repo.get(profile.get("user_id")) or {}
    meta = profile.get("metadata") or {}

    skill_rows = freelancer_skills_repo.list(filters={"freelancer_id": freelancer_id}, limit=200)
    skills = []
    for row in skill_rows:
        name = _skill_name(row)
        if not name:
            continue
        skills.append(
            {
                "name": name,
                "proficiency_level": row.get("proficiency_level") or "intermediate",
                "years_experience": row.get("years_experience"),
                "verified": bool(row.get("verified")),
            }
        )
    if not skills:
        for name in meta.get("skills") or []:
            skills.append(
                {
                    "name": str(name),
                    "proficiency_level": "intermediate",
                    "years_experience": None,
                    "verified": False,
                }
            )

    experience = freelancer_experience_repo.list(filters={"freelancer_id": freelancer_id}, limit=50)
    certifications = freelancer_certifications_repo.list(filters={"freelancer_id": freelancer_id}, limit=50)

    portfolios = portfolios_repo.list(filters={"freelancer_id": freelancer_id}, limit=5)
    portfolio = portfolios[0] if portfolios else None
    projects = []
    if portfolio:
        projects = portfolio_projects_repo.list(filters={"portfolio_id": str(portfolio["id"])}, limit=50)

    return {
        "id": profile.get("id"),
        "user_id": profile.get("user_id"),
        "headline": profile.get("headline"),
        "bio": profile.get("bio") or meta.get("bio") or meta.get("summary"),
        "hourly_rate": profile.get("hourly_rate"),
        "currency": profile.get("currency") or "INR",
        "availability_status": profile.get("availability_status"),
        "experience_years": profile.get("experience_years"),
        "github_url": profile.get("github_url"),
        "linkedin_url": profile.get("linkedin_url"),
        "website_url": profile.get("website_url"),
        "interview_status": profile.get("interview_status"),
        "platform_certified": bool(profile.get("platform_certified")),
        "metadata": meta,
        "created_at": profile.get("created_at"),
        "updated_at": profile.get("updated_at"),
        "full_name": user.get("full_name") or profile.get("headline") or "Freelancer",
        "email": user.get("email"),
        "avatar_url": user.get("avatar_url"),
        "country": user.get("country"),
        "verification_status": user.get("verification_status"),
        "skills": skills,
        "experience": experience,
        "certifications": certifications,
        "portfolio": portfolio,
        "portfolio_projects": projects,
    }


@router.get("")
async def list_freelancers(user: AuthUser = Depends(get_current_user)):
    return freelancer_profiles_repo.list(limit=100)


@router.get("/me/profile")
async def my_freelancer_profile(user: AuthUser = Depends(get_current_user)):
    rows = freelancer_profiles_repo.list(limit=500)
    profile = next((r for r in rows if str(r.get("user_id")) == user.id), None)
    if not profile:
        raise HTTPException(status_code=404, detail="Freelancer profile not found")
    return serialize_freelancer_detail(profile)


@router.get("/{freelancer_id}")
async def get_freelancer(freelancer_id: UUID, user: AuthUser = Depends(get_current_user)):
    row = freelancer_profiles_repo.get(freelancer_id)
    if not row:
        # Allow lookup by user_id as well (assigned_freelancer_id may be profiles.id)
        rows = freelancer_profiles_repo.list(limit=500)
        row = next((r for r in rows if str(r.get("user_id")) == str(freelancer_id)), None)
    if not row:
        raise HTTPException(status_code=404, detail="Freelancer not found")
    return serialize_freelancer_detail(row)
