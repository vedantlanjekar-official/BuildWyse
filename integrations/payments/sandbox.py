"""Sandbox payment provider — never moves real money."""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from uuid import uuid4


class SandboxPaymentProvider:
    """Simulated payment gateway for development and testing."""

    def create_order(self, amount: Decimal, currency: str, metadata: dict | None = None) -> dict:
        return {
            "provider_order_id": f"sbx_ord_{uuid4().hex[:16]}",
            "amount": str(amount),
            "currency": currency,
            "status": "created",
            "metadata": metadata or {},
        }

    def capture_payment(self, provider_order_id: str, amount: Decimal) -> dict:
        return {
            "provider_payment_id": f"sbx_pay_{uuid4().hex[:16]}",
            "provider_order_id": provider_order_id,
            "amount": str(amount),
            "status": "succeeded",
            "paid_at": datetime.now(timezone.utc).isoformat(),
        }

    def create_payout(self, recipient_id: str, amount: Decimal, currency: str) -> dict:
        return {
            "provider_payout_id": f"sbx_po_{uuid4().hex[:16]}",
            "recipient_id": recipient_id,
            "amount": str(amount),
            "currency": currency,
            "status": "completed",
            "paid_at": datetime.now(timezone.utc).isoformat(),
        }
