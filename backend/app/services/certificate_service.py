"""Project completion certificate generation."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from app.repositories.supabase_client import certificates_repo, projects_repo
from app.services.audit_service import audit_service


def generate_certificate_number(project_id: str) -> str:
    ts = datetime.now(timezone.utc).strftime("%Y%m%d")
    suffix = project_id.replace("-", "")[:8].upper()
    return f"BW-{ts}-{suffix}"


class CertificateService:
    def issue_certificate(
        self,
        project_id: UUID,
        actor_id: str,
        *,
        certificate_type: str = "project_completion",
        issued_to: str | None = None,
    ) -> dict:
        project = projects_repo.get(project_id)
        if not project:
            raise LookupError("Project not found")

        existing = certificates_repo.list(filters={"project_id": str(project_id)}, limit=1)
        if existing:
            return existing[0]

        recipient = issued_to or str(project.get("client_id"))
        cert_number = generate_certificate_number(str(project_id))

        cert = certificates_repo.insert(
            {
                "project_id": str(project_id),
                "certificate_number": cert_number,
                "certificate_type": certificate_type,
                "issued_to": recipient,
                "issued_by": "buildwyse",
                "status": "active",
                "issued_at": datetime.now(timezone.utc).isoformat(),
                "metadata": {"project_title": project.get("title")},
            }
        )

        projects_repo.update(
            project_id,
            {
                "state": "CERTIFIED",
                "certified_at": datetime.now(timezone.utc).isoformat(),
            },
        )

        audit_service.log(
            actor_id=actor_id,
            action="certificate.issue",
            entity_type="certificate",
            entity_id=cert["id"],
            project_id=project_id,
            new_values=cert,
        )
        return cert

    def verify_certificate(self, certificate_number: str) -> dict:
        rows = certificates_repo.list(limit=500)
        cert = next((c for c in rows if c.get("certificate_number") == certificate_number), None)
        if not cert:
            return {"certificate_number": certificate_number, "valid": False, "status": "not_found"}
        valid = cert.get("status") == "active"
        return {
            "certificate_number": certificate_number,
            "valid": valid,
            "status": cert.get("status"),
            "project_id": cert.get("project_id"),
            "issued_at": cert.get("issued_at"),
        }


certificate_service = CertificateService()
