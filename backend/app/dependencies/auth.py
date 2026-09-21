"""FastAPI auth dependencies."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import AuthUser, AuthenticationError, Role, decode_supabase_jwt, merge_roles_from_profile
from app.repositories.supabase_client import profiles_repo, user_roles_repo
from app.services.auth_bootstrap import bootstrap_auth_user

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    x_dev_user_id: Annotated[str | None, Header(alias="X-Dev-User-Id")] = None,
) -> AuthUser:
    """Validate Supabase JWT and load profile + roles."""
    from app.core.config import get_settings

    settings = get_settings()

    if credentials is None or not credentials.credentials:
        if settings.debug and x_dev_user_id:
            profile = profiles_repo.get(x_dev_user_id)
            if profile:
                roles_rows = user_roles_repo.list(filters={"user_id": x_dev_user_id})
                roles = merge_roles_from_profile(profile.get("account_type"), [r["role"] for r in roles_rows])
                return AuthUser(
                    id=str(profile["id"]),
                    email=profile.get("email"),
                    full_name=profile.get("full_name"),
                    account_type=profile.get("account_type"),
                    roles=roles,
                )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    try:
        payload = decode_supabase_jwt(credentials.credentials)
    except AuthenticationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    try:
        profile, roles = bootstrap_auth_user(payload)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to load user profile: {exc}",
        ) from exc

    return AuthUser(
        id=str(profile["id"]),
        email=profile.get("email") or payload.email,
        full_name=profile.get("full_name") or payload.full_name,
        account_type=profile.get("account_type") or payload.account_type,
        roles=roles,
    )


async def require_admin(user: Annotated[AuthUser, Depends(get_current_user)]) -> AuthUser:
    if not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user


def require_roles(*allowed: Role):
    async def _checker(user: Annotated[AuthUser, Depends(get_current_user)]) -> AuthUser:
        if user.is_admin:
            return user
        if not user.has_role(*allowed):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of: {[r.value for r in allowed]}",
            )
        return user

    return _checker
