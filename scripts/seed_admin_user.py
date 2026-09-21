"""Ensure the hardcoded BuildWyse admin Auth user, profile, and admin role exist."""

from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env", override=True)

from supabase import create_client

ADMIN_EMAIL = "buildwyseteam@gmail.com"
ADMIN_PASSWORD = "BuildWyse@2026"
ADMIN_NAME = "BuildWyse Admin"
ADMIN_ACCOUNT_TYPE = "admin"
ADMIN_ROLE = "admin"


def _find_user_by_email(sb, email: str):
    target = email.lower()
    page = 1
    per_page = 200
    while True:
        result = sb.auth.admin.list_users(page=page, per_page=per_page)
        users = getattr(result, "users", None) or []
        for user in users:
            if (getattr(user, "email", "") or "").lower() == target:
                return user
        if len(users) < per_page:
            return None
        page += 1


def main() -> None:
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    sb = create_client(url, key)

    existing = _find_user_by_email(sb, ADMIN_EMAIL)
    if existing:
        uid = str(existing.id)
        sb.auth.admin.update_user_by_id(
            uid,
            {
                "password": ADMIN_PASSWORD,
                "email_confirm": True,
                "user_metadata": {
                    "full_name": ADMIN_NAME,
                    "account_type": ADMIN_ACCOUNT_TYPE,
                },
            },
        )
        print("updated auth user", ADMIN_EMAIL, uid)
    else:
        created = sb.auth.admin.create_user(
            {
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD,
                "email_confirm": True,
                "user_metadata": {
                    "full_name": ADMIN_NAME,
                    "account_type": ADMIN_ACCOUNT_TYPE,
                },
            }
        )
        uid = str(created.user.id)
        print("created auth user", ADMIN_EMAIL, uid)

    sb.table("profiles").upsert(
        {
            "id": uid,
            "email": ADMIN_EMAIL,
            "full_name": ADMIN_NAME,
            "account_type": ADMIN_ACCOUNT_TYPE,
            "verification_status": "verified",
        }
    ).execute()

    roles = (
        sb.table("user_roles")
        .select("id")
        .eq("user_id", uid)
        .eq("role", ADMIN_ROLE)
        .execute()
    )
    if not roles.data:
        sb.table("user_roles").insert({"user_id": uid, "role": ADMIN_ROLE}).execute()

    print("profile+admin role ok", ADMIN_EMAIL)
    print("ADMIN_SEED_DONE")


if __name__ == "__main__":
    main()
