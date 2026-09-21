"""Public contact form endpoint — emails the BuildWyse team via Resend."""

from __future__ import annotations

import html
import logging

from fastapi import APIRouter, HTTPException

from app.core.config import get_settings
from app.schemas.contact import ContactMessageCreate, ContactMessageResponse
from integrations.email.factory import get_email_provider

logger = logging.getLogger(__name__)

router = APIRouter()

PURPOSE_LABELS = {
    "feedback": "Feedback",
    "collaboration": "Collaboration",
    "investor": "Investor",
    "partnership": "Partnership",
    "support": "Support",
    "press": "Press / Media",
    "other": "Other",
}


def _escape(value: str) -> str:
    return html.escape(value, quote=True)


@router.post("", response_model=ContactMessageResponse)
async def submit_contact(payload: ContactMessageCreate):
    settings = get_settings()
    purpose_label = PURPOSE_LABELS.get(payload.purpose, payload.purpose.title())

    try:
        provider = get_email_provider(
            mode=settings.email_mode,
            api_key=settings.email_api_key,
            from_address=settings.email_from,
        )
    except RuntimeError as exc:
        logger.exception("Email provider misconfigured")
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    subject = f"[BuildWyse Contact] {purpose_label} — {payload.name}"
    text_body = (
        f"New contact form submission from the BuildWyse website.\n\n"
        f"Name: {payload.name}\n"
        f"Email: {payload.email}\n"
        f"Purpose: {purpose_label}\n\n"
        f"Comment:\n{payload.comment}\n"
    )
    html_body = f"""
    <div style="font-family:Manrope,Segoe UI,sans-serif;line-height:1.5;color:#0d2a28">
      <h2 style="margin:0 0 12px">New BuildWyse contact</h2>
      <p style="margin:0 0 16px;color:#4a5f5c">A visitor submitted the website contact form.</p>
      <table style="border-collapse:collapse;width:100%;max-width:560px">
        <tr><td style="padding:8px 0;color:#6b7f7c;width:110px">Name</td><td style="padding:8px 0;font-weight:600">{_escape(payload.name)}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7f7c">Email</td><td style="padding:8px 0"><a href="mailto:{_escape(payload.email)}">{_escape(payload.email)}</a></td></tr>
        <tr><td style="padding:8px 0;color:#6b7f7c">Purpose</td><td style="padding:8px 0">{_escape(purpose_label)}</td></tr>
      </table>
      <div style="margin-top:18px;padding:14px 16px;background:#f3f6f8;border-radius:12px">
        <p style="margin:0 0 6px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6b7f7c">Comment</p>
        <p style="margin:0;white-space:pre-wrap">{_escape(payload.comment)}</p>
      </div>
    </div>
    """

    try:
        provider.send(
            to=settings.contact_to_email,
            subject=subject,
            body=text_body,
            html=html_body,
            reply_to=str(payload.email),
        )
    except Exception as exc:
        logger.exception("Failed to send contact notification")
        raise HTTPException(
            status_code=502,
            detail="Unable to send your message right now. Please try again shortly.",
        ) from exc

    # Automated acknowledgment to the visitor (best-effort; may fail on unverified domains)
    try:
        ack_subject = "We received your message — BuildWyse"
        ack_text = (
            f"Hi {payload.name},\n\n"
            f"Thanks for contacting BuildWyse about {purpose_label.lower()}. "
            f"Our team has received your message and will get back to you soon.\n\n"
            f"— BuildWyse Team\n"
        )
        ack_html = f"""
        <div style="font-family:Manrope,Segoe UI,sans-serif;line-height:1.55;color:#0d2a28">
          <p>Hi {_escape(payload.name)},</p>
          <p>Thanks for contacting <strong>BuildWyse</strong> about <strong>{_escape(purpose_label.lower())}</strong>.
          Our team has received your message and will get back to you soon.</p>
          <p style="margin-top:24px;color:#6b7f7c">— BuildWyse Team</p>
        </div>
        """
        provider.send(
            to=str(payload.email),
            subject=ack_subject,
            body=ack_text,
            html=ack_html,
        )
    except Exception:
        logger.warning("Contact acknowledgment email failed for %s", payload.email, exc_info=True)

    return ContactMessageResponse(
        status="ok",
        message="Thanks — your message was sent to the BuildWyse team.",
    )
