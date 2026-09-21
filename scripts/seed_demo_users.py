"""Seed demo Auth users, profiles, freelancer, and Valmet project. Run once after keys are set."""

from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env")

from supabase import create_client


def main() -> None:
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    sb = create_client(url, key)

    users = [
        {
            "id": "11111111-1111-4111-8111-111111111101",
            "email": "client@buildwyse.local",
            "password": "BuildWyseDemo1!",
            "full_name": "Demo Client",
            "account_type": "client",
            "role": "client",
        },
        {
            "id": "11111111-1111-4111-8111-111111111102",
            "email": "freelancer@buildwyse.local",
            "password": "BuildWyseDemo1!",
            "full_name": "Demo Freelancer",
            "account_type": "freelancer",
            "role": "freelancer",
        },
        {
            "id": "11111111-1111-4111-8111-111111111104",
            "email": "admin@buildwyse.local",
            "password": "BuildWyseDemo1!",
            "full_name": "Demo Admin",
            "account_type": "admin",
            "role": "admin",
        },
    ]

    try:
        existing = sb.auth.admin.list_users()
        for eu in getattr(existing, "users", []) or []:
            email = getattr(eu, "email", None)
            uid = str(getattr(eu, "id", ""))
            if email in {u["email"] for u in users} or uid in {u["id"] for u in users}:
                sb.auth.admin.delete_user(uid)
                print("deleted", email)
    except Exception as exc:
        print("list/delete warn", exc)

    for u in users:
        try:
            res = sb.auth.admin.create_user(
                {
                    "id": u["id"],
                    "email": u["email"],
                    "password": u["password"],
                    "email_confirm": True,
                    "user_metadata": {
                        "full_name": u["full_name"],
                        "account_type": u["account_type"],
                    },
                }
            )
            print("created auth", u["email"], getattr(res.user, "id", None))
        except Exception as exc:
            print("create auth fail", u["email"], exc)
            continue

        uid = u["id"]
        sb.table("profiles").upsert(
            {
                "id": uid,
                "email": u["email"],
                "full_name": u["full_name"],
                "account_type": u["account_type"],
                "verification_status": "verified",
            }
        ).execute()
        roles = (
            sb.table("user_roles")
            .select("id")
            .eq("user_id", uid)
            .eq("role", u["role"])
            .execute()
        )
        if not roles.data:
            sb.table("user_roles").insert({"user_id": uid, "role": u["role"]}).execute()
        print("profile+role ok", u["email"])

    fid = "11111111-1111-4111-8111-111111111103"
    sb.table("freelancer_profiles").upsert(
        {
            "id": fid,
            "user_id": "11111111-1111-4111-8111-111111111102",
            "headline": "Frontend engineer — corporate websites",
            "bio": "React Next.js TypeScript Tailwind specialist",
            "experience_years": 6,
            "availability_status": "available",
            "github_url": "https://github.com/demo-freelancer",
            "linkedin_url": "https://linkedin.com/in/demo-freelancer",
            "interview_status": "passed",
            "platform_certified": True,
            "metadata": {
                "skills": [
                    "React",
                    "Next.js",
                    "TypeScript",
                    "JavaScript",
                    "Tailwind",
                    "UI/UX",
                    "corporate websites",
                ]
            },
        }
    ).execute()
    print("freelancer profile ok")

    skills = sb.table("skills").select("id,name").limit(5).execute()
    print("skills_sample", len(skills.data or []))

    sb.table("projects").upsert(
        {
            "id": "33333333-3333-4333-8333-333333333301",
            "client_id": "11111111-1111-4111-8111-111111111101",
            "title": "Valmet Technologies Private Limited — Corporate Website",
            "description": "Modern corporate website with React, Next.js, TypeScript, Tailwind.",
            "state": "PROJECT_DISCOVERY",
            "industry": "Industrial Technology",
            "complexity": "medium",
            "currency": "INR",
        }
    ).execute()
    print("project ok")

    from openai import OpenAI

    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    models = list(client.models.list().data)[:1]
    print("openai_ok", bool(models))
    print("SEED_DONE")


if __name__ == "__main__":
    main()
