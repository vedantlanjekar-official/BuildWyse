"""Email provider factory."""

from __future__ import annotations

from typing import Protocol

from integrations.email.console import ConsoleEmailProvider
from integrations.email.resend import ResendEmailProvider


class EmailProvider(Protocol):
    def send(
        self,
        to: str,
        subject: str,
        body: str,
        *,
        html: str | None = None,
        reply_to: str | None = None,
    ) -> dict: ...


def get_email_provider(
    *,
    mode: str,
    api_key: str,
    from_address: str,
) -> EmailProvider:
    if mode == "resend":
        if not api_key:
            raise RuntimeError("EMAIL_API_KEY is required when EMAIL_MODE=resend")
        return ResendEmailProvider(api_key=api_key, from_address=from_address)
    return ConsoleEmailProvider()
