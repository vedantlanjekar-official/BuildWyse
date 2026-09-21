"""Simulated identity verification provider."""

from __future__ import annotations

from uuid import uuid4


class SimulatedIdentityProvider:
    def submit_verification(self, user_id: str, document_type: str, metadata: dict | None = None) -> dict:
        return {
            "verification_id": str(uuid4()),
            "user_id": user_id,
            "document_type": document_type,
            "status": "approved",
            "metadata": metadata or {},
        }

    def check_status(self, verification_id: str) -> dict:
        return {"verification_id": verification_id, "status": "approved"}
