"""In-memory fallback store when Supabase is unavailable."""

from __future__ import annotations

import copy
from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4


def _now() -> datetime:
    return datetime.now(timezone.utc)


# Map repository table names -> internal bucket names
_TABLE_ALIASES = {
    "project_requirements": "requirements",
    "project_phases": "phases",
    "project_tasks": "tasks",
    "phase_submissions": "submissions",
    "evidence_items": "evidence",
    "approval_records": "approvals",
    "platform_commissions": "commissions",
    "idempotency_keys": "idempotency",
}


class MemoryStore:
    """Thread-unsafe in-memory persistence for local development."""

    def __init__(self) -> None:
        self._tables: dict[str, dict[str, dict[str, Any]]] = {
            name: {}
            for name in [
                "profiles",
                "user_roles",
                "projects",
                "requirements",
                "ai_conversations",
                "ai_messages",
                "freelancer_profiles",
                "freelancer_skills",
                "skills",
                "freelancer_experience",
                "freelancer_certifications",
                "portfolios",
                "portfolio_projects",
                "matching_runs",
                "match_scores",
                "project_candidates",
                "phases",
                "milestones",
                "tasks",
                "submissions",
                "evidence",
                "approvals",
                "change_requests",
                "service_requests",
                "payment_orders",
                "payments",
                "payment_methods",
                "commissions",
                "payouts",
                "certificates",
                "notifications",
                "audit_logs",
                "idempotency",
                "organizations",
                "project_documents",
                "document_versions",
                "project_budgets",
                "technical_proposals",
                "calendar_events",
                "rejection_records",
                "verification_reports",
                "selections",
                "meetings",
                "project_messages",
                "calendar_events",
                "requirement_dna",
                "expertise_dna",
                "development_preferences",
            ]
        }
        self._seed_demo_data()

    def _bucket(self, table: str) -> dict[str, dict[str, Any]]:
        key = _TABLE_ALIASES.get(table, table)
        if key not in self._tables:
            self._tables[key] = {}
        return self._tables[key]

    def _seed_demo_data(self) -> None:
        client_id = "11111111-1111-4111-8111-111111111101"
        freelancer_user_id = "11111111-1111-4111-8111-111111111102"
        freelancer_id = "11111111-1111-4111-8111-111111111103"
        admin_id = "11111111-1111-4111-8111-111111111104"
        now = _now().isoformat()

        self._tables["profiles"][client_id] = {
            "id": client_id,
            "email": "client@example.com",
            "full_name": "Demo Client",
            "account_type": "client",
            "verification_status": "verified",
            "created_at": now,
            "updated_at": now,
        }
        self._tables["profiles"][freelancer_user_id] = {
            "id": freelancer_user_id,
            "email": "freelancer@example.com",
            "full_name": "Demo Freelancer",
            "account_type": "freelancer",
            "verification_status": "verified",
            "created_at": now,
            "updated_at": now,
        }
        self._tables["profiles"][admin_id] = {
            "id": admin_id,
            "email": "buildwyseteam@gmail.com",
            "full_name": "BuildWyse Admin",
            "account_type": "admin",
            "verification_status": "verified",
            "created_at": now,
            "updated_at": now,
        }
        role_id = str(uuid4())
        self._tables["user_roles"][role_id] = {
            "id": role_id,
            "user_id": admin_id,
            "role": "admin",
            "granted_at": now,
        }
        self._tables["user_roles"][str(uuid4())] = {
            "id": str(uuid4()),
            "user_id": client_id,
            "role": "client",
            "granted_at": now,
        }
        self._tables["user_roles"][str(uuid4())] = {
            "id": str(uuid4()),
            "user_id": freelancer_user_id,
            "role": "freelancer",
            "granted_at": now,
        }
        self._tables["freelancer_profiles"][freelancer_id] = {
            "id": freelancer_id,
            "user_id": freelancer_user_id,
            "headline": "Frontend engineer — corporate websites",
            "bio": "Specialist in modern corporate websites, design systems, and high-conversion marketing sites.",
            "hourly_rate": 2500,
            "currency": "INR",
            "experience_years": 6,
            "platform_certified": True,
            "availability_status": "available",
            "interview_status": "passed",
            "github_url": "https://github.com/demo-freelancer",
            "linkedin_url": "https://linkedin.com/in/demo-freelancer",
            "website_url": "https://demo-freelancer.example",
            "metadata": {
                "skills": [
                    "React",
                    "Next.js",
                    "TypeScript",
                    "JavaScript",
                    "Tailwind",
                    "UI/UX",
                    "responsive development",
                    "corporate websites",
                ]
            },
            "created_at": now,
            "updated_at": now,
        }
        for skill in ["React", "Next.js", "TypeScript", "Tailwind", "UI/UX"]:
            sid = str(uuid4())
            self._tables["freelancer_skills"][sid] = {
                "id": sid,
                "freelancer_id": freelancer_id,
                "skill_name": skill,
                "verified": True,
                "proficiency_level": "expert",
                "years_experience": 5,
            }
        exp_id = str(uuid4())
        self._tables["freelancer_experience"][exp_id] = {
            "id": exp_id,
            "freelancer_id": freelancer_id,
            "company_name": "Studio North",
            "role_title": "Lead Frontend Engineer",
            "description": "Led delivery of multi-brand corporate websites and design systems.",
            "start_date": "2021-01-01",
            "end_date": None,
            "is_current": True,
            "technologies": ["React", "Next.js", "TypeScript"],
        }
        cert_id = str(uuid4())
        self._tables["freelancer_certifications"][cert_id] = {
            "id": cert_id,
            "freelancer_id": freelancer_id,
            "name": "BuildWyse Platform Certified",
            "issuer": "BuildWyse",
            "verified": True,
            "issued_at": "2025-06-01",
        }
        portfolio_id = str(uuid4())
        self._tables["portfolios"][portfolio_id] = {
            "id": portfolio_id,
            "freelancer_id": freelancer_id,
            "title": "Selected work",
            "summary": "Corporate websites and product marketing experiences.",
            "is_public": True,
        }
        proj_id = str(uuid4())
        self._tables["portfolio_projects"][proj_id] = {
            "id": proj_id,
            "portfolio_id": portfolio_id,
            "title": "Industrial manufacturer website",
            "description": "Responsive marketing site with CMS and localization.",
            "technologies": ["Next.js", "Tailwind", "TypeScript"],
            "role": "Frontend lead",
            "highlights": ["SEO-ready", "Design system", "CMS integration"],
        }

        # Extra freelancers for Top 10 matching demos
        for i in range(2, 12):
            uid = f"11111111-1111-4111-8111-1111111112{i:02d}"
            fid = f"22222222-2222-4222-8222-2222222222{i:02d}"
            self._tables["profiles"][uid] = {
                "id": uid,
                "email": f"freelancer{i}@example.com",
                "full_name": f"Candidate Freelancer {i}",
                "account_type": "freelancer",
                "verification_status": "verified",
                "created_at": now,
                "updated_at": now,
            }
            skill_sets = [
                ["React", "TypeScript", "Tailwind"],
                ["Next.js", "Node.js", "PostgreSQL"],
                ["Python", "FastAPI", "React"],
                ["UI/UX", "Figma", "Tailwind"],
                ["React", "JavaScript", "corporate websites"],
            ][i % 5]
            self._tables["freelancer_profiles"][fid] = {
                "id": fid,
                "user_id": uid,
                "headline": f"Engineer specializing in {skill_sets[0]}",
                "experience_years": 2 + (i % 8),
                "platform_certified": i % 2 == 0,
                "availability_status": "available",
                "metadata": {"skills": skill_sets},
                "created_at": now,
                "updated_at": now,
            }

        # Valmet demo project
        project_id = "33333333-3333-4333-8333-333333333301"
        self._tables["projects"][project_id] = {
            "id": project_id,
            "client_id": client_id,
            "title": "Valmet Technologies Private Limited — Corporate Website",
            "summary": "Modern corporate website for Valmet Technologies with responsive design.",
            "state": "PROJECT_DISCOVERY",
            "industry": "Industrial Technology",
            "complexity": "medium",
            "created_at": now,
            "updated_at": now,
        }

    def insert(self, table: str, data: dict[str, Any]) -> dict[str, Any]:
        store = self._bucket(table)
        row = copy.deepcopy(data)
        if "id" not in row or not row["id"]:
            row["id"] = str(uuid4())
        row_id = str(row["id"])
        now = _now().isoformat()
        row.setdefault("created_at", now)
        row.setdefault("updated_at", now)
        store[row_id] = row
        return copy.deepcopy(row)

    def update(self, table: str, row_id: str | UUID, data: dict[str, Any]) -> dict[str, Any] | None:
        store = self._bucket(table)
        key = str(row_id)
        if key not in store:
            return None
        store[key].update(data)
        store[key]["updated_at"] = _now().isoformat()
        return copy.deepcopy(store[key])

    def get(self, table: str, row_id: str | UUID) -> dict[str, Any] | None:
        store = self._bucket(table)
        row = store.get(str(row_id))
        return copy.deepcopy(row) if row else None

    def list(
        self,
        table: str,
        *,
        filters: dict[str, Any] | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        store = self._bucket(table)
        rows = list(store.values())
        if filters:
            rows = [r for r in rows if all(str(r.get(k)) == str(v) for k, v in filters.items())]
        rows.sort(key=lambda r: r.get("created_at", ""), reverse=True)
        return [copy.deepcopy(r) for r in rows[offset : offset + limit]]

    def delete(self, table: str, row_id: str | UUID) -> bool:
        store = self._bucket(table)
        key = str(row_id)
        if key in store:
            del store[key]
            return True
        return False


_memory_store: MemoryStore | None = None


def get_memory_store() -> MemoryStore:
    global _memory_store
    if _memory_store is None:
        _memory_store = MemoryStore()
    return _memory_store
