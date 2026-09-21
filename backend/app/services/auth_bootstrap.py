"""Bootstrap profile + roles from auth metadata."""

from __future__ import annotations

from uuid import uuid4

from app.core.security import TokenPayload, merge_roles_from_profile
from app.repositories.supabase_client import (
    freelancer_profiles_repo,
    profiles_repo,
    user_roles_repo,
)

ALLOWED_ACCOUNT_TYPES = {"client", "freelancer", "enterprise", "admin"}


def _ensure_role(user_id: str, account_type: str) -> None:
    role = account_type if account_type in {"client", "freelancer", "admin", "enterprise"} else "client"
    # enterprise maps to org_manager for primary role row if needed
    db_role = "org_manager" if role == "enterprise" else role
    existing = user_roles_repo.list(filters={"user_id": user_id}, limit=20)
    if any(str(r.get("role")) == db_role for r in existing):
        return
    user_roles_repo.insert(
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "role": db_role,
        }
    )


def _ensure_freelancer_profile(user_id: str, full_name: str | None) -> None:
    rows = freelancer_profiles_repo.list(filters={"user_id": user_id}, limit=5)
    if rows:
        return
    freelancer_profiles_repo.insert(
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "headline": full_name or "Freelancer",
            "availability_status": "available",
            "platform_certified": False,
            "interview_status": "not_started",
            "metadata": {},
        }
    )


def bootstrap_auth_user(payload: TokenPayload) -> tuple[dict, list]:
    """Create/sync profile + roles from JWT/signup metadata. Returns (profile, roles)."""
    user_id = payload.sub
    meta_account = payload.account_type if payload.account_type in ALLOWED_ACCOUNT_TYPES else None
    profile = profiles_repo.get(user_id)

    if not profile:
        account_type = meta_account or "client"
        profile = profiles_repo.insert(
            {
                "id": user_id,
                "email": payload.email or f"{user_id}@unknown.local",
                "full_name": payload.full_name,
                "account_type": account_type,
                "verification_status": "unverified",
            }
        )
    else:
        updates: dict = {}
        current_type = str(profile.get("account_type") or "client")
        # Prefer signup metadata when profile was incorrectly defaulted to client
        if meta_account and meta_account != "admin" and current_type == "client" and meta_account != "client":
            updates["account_type"] = meta_account
            current_type = meta_account
        if payload.full_name and not profile.get("full_name"):
            updates["full_name"] = payload.full_name
        if payload.email and not profile.get("email"):
            updates["email"] = payload.email
        if updates:
            updated = profiles_repo.update(user_id, updates)
            if updated:
                profile = updated
            else:
                profile = {**profile, **updates}

    account_type = str(profile.get("account_type") or meta_account or "client")
    _ensure_role(user_id, account_type)
    if account_type == "freelancer":
        _ensure_freelancer_profile(user_id, profile.get("full_name") or payload.full_name)

    roles_rows = user_roles_repo.list(filters={"user_id": user_id}, limit=20)
    roles = merge_roles_from_profile(account_type, [r["role"] for r in roles_rows])
    return profile, roles
