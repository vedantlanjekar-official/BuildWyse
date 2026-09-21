"""Auth endpoints."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from app.core.security import AuthUser
from app.dependencies.auth import get_current_user
from app.schemas.users import ProfileResponse
from app.services import profile_service

router = APIRouter()


@router.get("/me", response_model=ProfileResponse)
async def get_me(user: AuthUser = Depends(get_current_user)):
    from app.repositories.supabase_client import profiles_repo

    profile = profiles_repo.get(user.id) or {}
    merged = {
        "id": user.id,
        "email": user.email or profile.get("email") or "",
        "full_name": user.full_name or profile.get("full_name"),
        "phone": profile.get("phone"),
        "avatar_url": profile.get("avatar_url"),
        "account_type": user.account_type or profile.get("account_type") or "client",
        "verification_status": profile.get("verification_status") or "unverified",
        "country": profile.get("country"),
        "address": profile.get("address"),
        "address_line1": profile.get("address_line1"),
        "address_line2": profile.get("address_line2"),
        "state": profile.get("state"),
        "city": profile.get("city"),
        "pincode": profile.get("pincode"),
        "email_verified": profile.get("email_verified", False),
        "phone_verified": profile.get("phone_verified", False),
        "government_id_verified": profile.get("government_id_verified", False),
        "government_id_type": profile.get("government_id_type"),
        "government_id_number": profile.get("government_id_number"),
        "aadhaar_number": profile.get("aadhaar_number"),
        "government_id_url": profile.get("government_id_url"),
        "bank_name": profile.get("bank_name"),
        "bank_branch": profile.get("bank_branch"),
        "account_holder_name": profile.get("account_holder_name"),
        "account_number": profile.get("account_number"),
        "ifsc_code": profile.get("ifsc_code"),
        "card_type": profile.get("card_type"),
        "card_number": profile.get("card_number"),
        "card_expiry": profile.get("card_expiry"),
        "created_at": profile.get("created_at") or datetime.now(timezone.utc),
        "updated_at": profile.get("updated_at"),
    }
    return ProfileResponse.model_validate(profile_service.serialize_profile(merged, user.roles))


@router.get("/session")
async def get_session(user: AuthUser = Depends(get_current_user)):
    return {
        "user_id": user.id,
        "email": user.email,
        "roles": [r.value for r in user.roles],
        "is_admin": user.is_admin,
    }
