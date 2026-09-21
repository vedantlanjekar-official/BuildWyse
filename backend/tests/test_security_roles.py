"""Unit tests for role mapping used by auth dependencies."""

from app.core.security import DB_ROLE_MAP, Role, map_db_role, merge_roles_from_profile


def test_admin_role_mapping():
    assert map_db_role("admin") == Role.ADMIN
    assert DB_ROLE_MAP["admin"] == Role.ADMIN


def test_client_and_freelancer_role_mapping():
    assert map_db_role("client") == Role.CLIENT
    assert map_db_role("freelancer") == Role.FREELANCER


def test_merge_roles_from_profile_includes_account_type():
    roles = merge_roles_from_profile("admin", [])
    assert Role.ADMIN in roles
