"""JWT validation and role mapping."""

from __future__ import annotations

from enum import Enum
from typing import Any

from jose import JWTError, jwt
from pydantic import BaseModel, Field

from app.core.config import get_settings


class Role(str, Enum):
    CLIENT = "CLIENT"
    FREELANCER = "FREELANCER"
    TEAM_MEMBER = "TEAM_MEMBER"
    TEAM_LEADER = "TEAM_LEADER"
    ENTERPRISE_EMPLOYEE = "ENTERPRISE_EMPLOYEE"
    ENTERPRISE_MANAGER = "ENTERPRISE_MANAGER"
    ADMIN = "ADMIN"


DB_ROLE_MAP: dict[str, Role] = {
    "client": Role.CLIENT,
    "freelancer": Role.FREELANCER,
    "member": Role.TEAM_MEMBER,
    "team_leader": Role.TEAM_LEADER,
    "team_member": Role.TEAM_MEMBER,
    "enterprise_employee": Role.ENTERPRISE_EMPLOYEE,
    "org_manager": Role.ENTERPRISE_MANAGER,
    "enterprise_manager": Role.ENTERPRISE_MANAGER,
    "admin": Role.ADMIN,
}


def map_db_role(role: str) -> Role | None:
    return DB_ROLE_MAP.get(role.lower().strip())


class TokenPayload(BaseModel):
    sub: str
    email: str | None = None
    role: str | None = None
    exp: int | None = None
    full_name: str | None = None
    account_type: str | None = None


class AuthUser(BaseModel):
    id: str
    email: str | None = None
    full_name: str | None = None
    account_type: str | None = None
    roles: list[Role] = Field(default_factory=list)

    def has_role(self, *roles: Role) -> bool:
        return any(r in self.roles for r in roles)

    @property
    def is_admin(self) -> bool:
        return Role.ADMIN in self.roles


class AuthenticationError(Exception):
    pass


def _normalize_account_type(raw: str | None) -> str | None:
    if not raw:
        return None
    value = str(raw).strip().lower()
    if value in {"client", "freelancer", "enterprise", "admin"}:
        return value
    mapped = map_db_role(value)
    if mapped == Role.CLIENT:
        return "client"
    if mapped == Role.FREELANCER:
        return "freelancer"
    if mapped == Role.ADMIN:
        return "admin"
    if mapped in {Role.ENTERPRISE_EMPLOYEE, Role.ENTERPRISE_MANAGER}:
        return "enterprise"
    return None


def decode_supabase_jwt(token: str) -> TokenPayload:
    """Validate Supabase access token.

    Newer Supabase projects sign JWTs with ES256. Prefer Auth API validation
    via service/anon client; fall back to HS256 local verify when possible.
    """
    settings = get_settings()

    # Preferred: ask Supabase Auth to validate (works for ES256 and HS256)
    try:
        from supabase import create_client

        key = settings.supabase_service_role_key or settings.supabase_anon_key
        if settings.supabase_url and key:
            client = create_client(settings.supabase_url, key)
            user_resp = client.auth.get_user(token)
            user = getattr(user_resp, "user", None)
            if user and getattr(user, "id", None):
                meta = getattr(user, "user_metadata", None) or {}
                if not isinstance(meta, dict):
                    meta = {}
                return TokenPayload(
                    sub=str(user.id),
                    email=getattr(user, "email", None),
                    role="authenticated",
                    full_name=(meta.get("full_name") or meta.get("name")),
                    account_type=_normalize_account_type(meta.get("account_type")),
                )
    except Exception:
        pass

    # Fallback: local HS256 (legacy projects)
    secret = settings.supabase_jwt_secret
    if not secret:
        raise AuthenticationError("Unable to validate token (no Auth API success / JWT secret)")
    try:
        payload: dict[str, Any] = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
    except JWTError as exc:
        # Last resort: accept unverified claims only in debug (still require sub)
        if settings.debug:
            try:
                payload = jwt.get_unverified_claims(token)
            except Exception as inner:
                raise AuthenticationError("Invalid or expired token") from inner
        else:
            raise AuthenticationError("Invalid or expired token") from exc

    sub = payload.get("sub")
    if not sub:
        raise AuthenticationError("Token missing subject")
    meta = payload.get("user_metadata") or payload.get("app_metadata") or {}
    if not isinstance(meta, dict):
        meta = {}
    return TokenPayload(
        sub=str(sub),
        email=payload.get("email"),
        role=payload.get("role"),
        exp=payload.get("exp"),
        full_name=(meta.get("full_name") or meta.get("name")),
        account_type=_normalize_account_type(meta.get("account_type")),
    )


def merge_roles_from_profile(account_type: str | None, db_roles: list[str]) -> list[Role]:
    roles: set[Role] = set()
    if account_type:
        mapped = map_db_role(account_type)
        if mapped:
            roles.add(mapped)
    for raw in db_roles:
        mapped = map_db_role(raw)
        if mapped:
            roles.add(mapped)
    return sorted(roles, key=lambda r: r.value)
