"""Console email provider — logs emails instead of sending."""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


class ConsoleEmailProvider:
    def send(
        self,
        to: str,
        subject: str,
        body: str,
        *,
        html: str | None = None,
        reply_to: str | None = None,
    ) -> dict:
        logger.info(
            "[EMAIL] to=%s subject=%s reply_to=%s body=%s html=%s",
            to,
            subject,
            reply_to,
            body[:200],
            (html or "")[:80],
        )
        return {"status": "logged", "to": to, "subject": subject}
