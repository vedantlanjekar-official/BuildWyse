"""Idempotency key handling for payment and mutation endpoints."""

from __future__ import annotations

import hashlib
import json
from typing import Any

from app.repositories.supabase_client import idempotency_repo


def _fingerprint(scope: str, key: str, payload: dict[str, Any] | None = None) -> str:
    raw = f"{scope}:{key}"
    if payload:
        raw += ":" + json.dumps(payload, sort_keys=True, default=str)
    return hashlib.sha256(raw.encode()).hexdigest()


def check_idempotency(scope: str, key: str, payload: dict[str, Any] | None = None) -> dict[str, Any] | None:
    """Return cached response if this idempotency key was already processed."""
    fp = _fingerprint(scope, key, payload)
    rows = idempotency_repo.list(filters={"fingerprint": fp}, limit=1)
    return rows[0]["response"] if rows else None


def store_idempotency(
    scope: str,
    key: str,
    response: dict[str, Any],
    payload: dict[str, Any] | None = None,
) -> None:
    fp = _fingerprint(scope, key, payload)
    idempotency_repo.insert(
        {
            "fingerprint": fp,
            "scope": scope,
            "idempotency_key": key,
            "request_hash": fp,
            "response": response,
        }
    )
