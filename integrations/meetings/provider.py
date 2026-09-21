"""Google Meet / video meeting link providers."""

from __future__ import annotations

import json
import logging
import os
import time
from datetime import datetime, timezone
from uuid import uuid4

import httpx

logger = logging.getLogger(__name__)


def _slug_code() -> str:
    raw = uuid4().hex
    return f"{raw[:3]}-{raw[3:7]}-{raw[7:10]}"


class SandboxMeetProvider:
    """Dev provider — creates a unique Meet-style room URL without Google OAuth."""

    def create_meeting(
        self,
        *,
        title: str,
        starts_at: datetime,
        ends_at: datetime,
        attendee_emails: list[str] | None = None,
    ) -> dict:
        code = _slug_code()
        url = f"https://meet.google.com/{code}"
        return {
            "provider": "sandbox",
            "meeting_url": url,
            "hangout_link": url,
            "external_event_id": f"sbx_meet_{uuid4().hex[:12]}",
            "title": title,
            "starts_at": starts_at.isoformat(),
            "ends_at": ends_at.isoformat(),
            "attendees": attendee_emails or [],
        }


class GoogleMeetProvider:
    """
    Creates a Google Calendar event with a Google Meet conference.

    Auth (first match wins):
    - GOOGLE_OAUTH_ACCESS_TOKEN (short-lived)
    - GOOGLE_OAUTH_REFRESH_TOKEN + GOOGLE_OAUTH_CLIENT_ID + GOOGLE_OAUTH_CLIENT_SECRET
    - GOOGLE_SERVICE_ACCOUNT_JSON (path or raw JSON) + optional GOOGLE_CALENDAR_IMPERSONATE
    """

    def __init__(self) -> None:
        self.calendar_id = os.getenv("GOOGLE_CALENDAR_ID") or "primary"

    def _access_token(self) -> str:
        direct = os.getenv("GOOGLE_OAUTH_ACCESS_TOKEN") or ""
        if direct:
            return direct

        refresh = os.getenv("GOOGLE_OAUTH_REFRESH_TOKEN") or ""
        client_id = os.getenv("GOOGLE_OAUTH_CLIENT_ID") or ""
        client_secret = os.getenv("GOOGLE_OAUTH_CLIENT_SECRET") or ""
        if refresh and client_id and client_secret:
            with httpx.Client(timeout=30.0) as client:
                res = client.post(
                    "https://oauth2.googleapis.com/token",
                    data={
                        "client_id": client_id,
                        "client_secret": client_secret,
                        "refresh_token": refresh,
                        "grant_type": "refresh_token",
                    },
                )
                res.raise_for_status()
                return str(res.json()["access_token"])

        sa_raw = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON") or ""
        if sa_raw:
            return self._service_account_token(sa_raw)

        raise RuntimeError("Google Meet credentials not configured")

    def _service_account_token(self, sa_raw: str) -> str:
        try:
            if sa_raw.strip().startswith("{"):
                info = json.loads(sa_raw)
            else:
                with open(sa_raw, encoding="utf-8") as f:
                    info = json.load(f)
        except Exception as exc:
            raise RuntimeError(f"Invalid GOOGLE_SERVICE_ACCOUNT_JSON: {exc}") from exc

        now = int(time.time())
        impersonate = os.getenv("GOOGLE_CALENDAR_IMPERSONATE") or info.get("client_email")
        claim = {
            "iss": info["client_email"],
            "scope": "https://www.googleapis.com/auth/calendar",
            "aud": "https://oauth2.googleapis.com/token",
            "iat": now,
            "exp": now + 3600,
            "sub": impersonate,
        }
        # Minimal JWT without extra deps: use PyJWT if available, else fail to sandbox
        try:
            import jwt  # type: ignore
        except ImportError as exc:
            raise RuntimeError("PyJWT required for service-account Google Meet") from exc

        assertion = jwt.encode(claim, info["private_key"], algorithm="RS256")
        with httpx.Client(timeout=30.0) as client:
            res = client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                    "assertion": assertion,
                },
            )
            res.raise_for_status()
            return str(res.json()["access_token"])

    def create_meeting(
        self,
        *,
        title: str,
        starts_at: datetime,
        ends_at: datetime,
        attendee_emails: list[str] | None = None,
    ) -> dict:
        token = self._access_token()
        request_id = uuid4().hex
        payload = {
            "summary": title,
            "description": "BuildWyse scheduled meeting",
            "start": {"dateTime": starts_at.astimezone(timezone.utc).isoformat(), "timeZone": "UTC"},
            "end": {"dateTime": ends_at.astimezone(timezone.utc).isoformat(), "timeZone": "UTC"},
            "attendees": [{"email": e} for e in (attendee_emails or []) if e],
            "conferenceData": {
                "createRequest": {
                    "requestId": request_id,
                    "conferenceSolutionKey": {"type": "hangoutsMeet"},
                }
            },
        }
        with httpx.Client(timeout=30.0) as client:
            res = client.post(
                f"https://www.googleapis.com/calendar/v3/calendars/{self.calendar_id}/events",
                params={"conferenceDataVersion": 1, "sendUpdates": "all"},
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json=payload,
            )
            res.raise_for_status()
            data = res.json()

        hangout = data.get("hangoutLink") or ""
        if not hangout:
            entry = data.get("conferenceData", {}).get("entryPoints") or []
            for ep in entry:
                if ep.get("entryPointType") == "video" and ep.get("uri"):
                    hangout = ep["uri"]
                    break
        if not hangout:
            hangout = f"https://meet.google.com/{_slug_code()}"

        return {
            "provider": "google",
            "meeting_url": hangout,
            "hangout_link": hangout,
            "external_event_id": data.get("id"),
            "title": title,
            "starts_at": starts_at.isoformat(),
            "ends_at": ends_at.isoformat(),
            "attendees": attendee_emails or [],
            "raw": data,
        }


def get_meet_provider():
    mode = (os.getenv("GOOGLE_MEET_MODE") or os.getenv("MEET_MODE") or "sandbox").lower()
    if mode in {"google", "live"}:
        try:
            provider = GoogleMeetProvider()
            # Probe credentials early
            if (
                os.getenv("GOOGLE_OAUTH_ACCESS_TOKEN")
                or os.getenv("GOOGLE_OAUTH_REFRESH_TOKEN")
                or os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
            ):
                logger.info("Using Google Meet provider")
                return provider
            logger.warning("GOOGLE_MEET_MODE=%s but credentials missing — sandbox Meet", mode)
        except Exception as exc:
            logger.warning("Google Meet provider unavailable (%s) — sandbox", exc)
    return SandboxMeetProvider()
