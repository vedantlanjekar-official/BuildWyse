"""Resend email provider — sends transactional mail via Resend HTTP API."""

from __future__ import annotations

import logging

import httpx

logger = logging.getLogger(__name__)

RESEND_API_URL = "https://api.resend.com/emails"


class ResendEmailProvider:
    def __init__(self, api_key: str, from_address: str) -> None:
        self.api_key = api_key
        self.from_address = from_address

    def send(
        self,
        to: str,
        subject: str,
        body: str,
        *,
        html: str | None = None,
        reply_to: str | None = None,
    ) -> dict:
        payload: dict = {
            "from": self.from_address,
            "to": [to],
            "subject": subject,
            "text": body,
        }
        if html:
            payload["html"] = html
        if reply_to:
            payload["reply_to"] = reply_to

        with httpx.Client(timeout=20.0) as client:
            response = client.post(
                RESEND_API_URL,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )

        if response.status_code >= 400:
            logger.error("Resend failed status=%s body=%s", response.status_code, response.text)
            # Soft-fail so product flows (meetings, OTP fallbacks) are not blocked by domain limits
            return {
                "status": "failed",
                "to": to,
                "subject": subject,
                "error": response.text,
                "status_code": response.status_code,
            }

        data = response.json()
        logger.info("[EMAIL:resend] to=%s subject=%s id=%s", to, subject, data.get("id"))
        return {"status": "sent", "to": to, "subject": subject, "id": data.get("id")}
