"""User profile endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.api.v1 import payment_methods as payment_methods_routes
from app.core.security import AuthUser, Role, merge_roles_from_profile
from app.dependencies.auth import get_current_user
from app.repositories.supabase_client import profiles_repo, user_roles_repo
from app.schemas.users import (
    GovernmentIdSubmitRequest,
    MediaUploadRequest,
    OtpSendRequest,
    OtpSendResponse,
    OtpVerifyRequest,
    ProfileResponse,
    ProfileUpdate,
)
from app.services import profile_service as profile_service

router = APIRouter()
router.include_router(payment_methods_routes.router)

def _response(profile: dict, roles: list) -> ProfileResponse:
    return ProfileResponse.model_validate(profile_service.serialize_profile(profile, roles))


@router.get("/me", response_model=ProfileResponse)
async def get_profile(user: AuthUser = Depends(get_current_user)):
    profile = profiles_repo.get(user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    profile = profile_service.refresh_verification_status(user.id, profile)
    return _response(profile, user.roles)


@router.patch("/me", response_model=ProfileResponse)
async def update_profile(body: ProfileUpdate, user: AuthUser = Depends(get_current_user)):
    payload = body.model_dump(exclude_unset=True)
    current = profiles_repo.get(user.id) or {}

    if "phone" in payload and payload["phone"] != current.get("phone"):
        payload["phone_verified"] = False

    line1 = payload.get("address_line1", current.get("address_line1"))
    line2 = payload.get("address_line2", current.get("address_line2"))
    city = payload.get("city", current.get("city"))
    state = payload.get("state", current.get("state"))
    pincode = payload.get("pincode", current.get("pincode"))
    if any(k in payload for k in ("address_line1", "address_line2", "city", "state", "pincode")):
        payload["address"] = ", ".join(
            part for part in [line1, line2, city, state, pincode] if part
        )

    try:
        payload = profile_service.sanitize_bank_card_payload(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    # Ignore masked placeholders coming back from the UI
    for sensitive in ("account_number", "card_number", "aadhaar_number", "government_id_number"):
        value = payload.get(sensitive)
        if isinstance(value, str) and ("•" in value or "X" in value.upper()):
            payload.pop(sensitive, None)

    updated = profiles_repo.update(user.id, payload)
    profile = profile_service.refresh_verification_status(user.id, updated or profiles_repo.get(user.id))
    return _response(profile, user.roles)


@router.post("/me/avatar", response_model=ProfileResponse)
async def upload_avatar(body: MediaUploadRequest, user: AuthUser = Depends(get_current_user)):
    try:
        url = profile_service.upload_identity_file(
            user_id=user.id,
            filename=body.filename,
            content_type=body.content_type,
            data_base64=body.data_base64,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    updated = profiles_repo.update(user.id, {"avatar_url": url})
    profile = profile_service.refresh_verification_status(user.id, updated or profiles_repo.get(user.id))
    return _response(profile, user.roles)


@router.post("/me/otp/send", response_model=OtpSendResponse)
async def send_otp(body: OtpSendRequest, user: AuthUser = Depends(get_current_user)):
    profile = profiles_repo.get(user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    if body.channel == "email":
        destination = profile.get("email")
        if not destination:
            raise HTTPException(status_code=400, detail="Email is missing on your profile")
    else:
        destination = profile.get("phone")
        if not destination:
            raise HTTPException(status_code=400, detail="Save a contact number before verifying phone")
    result = profile_service.send_otp(user_id=user.id, channel=body.channel, destination=destination)
    return OtpSendResponse.model_validate(result)


@router.post("/me/otp/verify", response_model=ProfileResponse)
async def verify_otp(body: OtpVerifyRequest, user: AuthUser = Depends(get_current_user)):
    ok = profile_service.verify_otp(user_id=user.id, channel=body.channel, code=body.code)
    if not ok:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")
    profile = profiles_repo.get(user.id)
    return _response(profile or {}, user.roles)


@router.post("/me/government-id", response_model=ProfileResponse)
async def submit_government_id(body: GovernmentIdSubmitRequest, user: AuthUser = Depends(get_current_user)):
    try:
        profile = profile_service.submit_government_id(
            user_id=user.id,
            id_type=body.id_type,
            id_number=body.id_number,
            filename=body.filename,
            content_type=body.content_type,
            data_base64=body.data_base64,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _response(profile, user.roles)


@router.get("/{user_id}", response_model=ProfileResponse)
async def get_user(user_id: UUID, user: AuthUser = Depends(get_current_user)):
    if str(user_id) != user.id and not user.is_admin:
        raise HTTPException(status_code=403, detail="Access denied")
    profile = profiles_repo.get(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    roles_rows = user_roles_repo.list(filters={"user_id": str(user_id)})
    roles = merge_roles_from_profile(profile.get("account_type"), [r["role"] for r in roles_rows])
    return _response(profile, roles)
