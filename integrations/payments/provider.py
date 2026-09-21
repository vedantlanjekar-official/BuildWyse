"""Payment provider adapters — Razorpay when configured, else sandbox."""

from __future__ import annotations

import hashlib
import hmac
import logging
import os
from datetime import datetime, timezone
from decimal import Decimal
from uuid import uuid4

import httpx

logger = logging.getLogger(__name__)


class SandboxPaymentProvider:
    """Simulated payment gateway for development and testing."""

    def create_order(self, amount: Decimal, currency: str, metadata: dict | None = None) -> dict:
        return {
            "provider": "sandbox",
            "provider_order_id": f"sbx_ord_{uuid4().hex[:16]}",
            "amount": str(amount),
            "currency": currency,
            "status": "created",
            "checkout": {
                "mode": "sandbox",
                "amount": float(amount),
                "currency": currency,
                "key_id": None,
            },
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


class RazorpayPaymentProvider:
    """Razorpay Orders API integration."""

    def __init__(self, key_id: str, key_secret: str) -> None:
        self.key_id = key_id
        self.key_secret = key_secret
        self.base = "https://api.razorpay.com/v1"

    def create_order(self, amount: Decimal, currency: str, metadata: dict | None = None) -> dict:
        # Razorpay expects amount in paise for INR
        amount_paise = int(Decimal(amount) * 100)
        payload = {
            "amount": amount_paise,
            "currency": currency or "INR",
            "receipt": f"bw_{uuid4().hex[:12]}",
            "notes": {str(k): str(v) for k, v in (metadata or {}).items()},
        }
        with httpx.Client(timeout=30.0) as client:
            res = client.post(
                f"{self.base}/orders",
                json=payload,
                auth=(self.key_id, self.key_secret),
            )
            res.raise_for_status()
            data = res.json()
        return {
            "provider": "razorpay",
            "provider_order_id": data["id"],
            "amount": str(amount),
            "currency": currency,
            "status": data.get("status") or "created",
            "checkout": {
                "mode": "razorpay",
                "key_id": self.key_id,
                "amount": amount_paise,
                "currency": currency or "INR",
                "razorpay_order_id": data["id"],
                "name": "BuildWyse",
                "description": str((metadata or {}).get("description") or "Phase payment"),
            },
            "metadata": metadata or {},
            "raw": data,
        }

    def capture_payment(self, provider_order_id: str, amount: Decimal) -> dict:
        return {
            "provider_payment_id": f"pay_{uuid4().hex[:14]}",
            "provider_order_id": provider_order_id,
            "amount": str(amount),
            "status": "succeeded",
            "paid_at": datetime.now(timezone.utc).isoformat(),
        }

    def verify_signature(self, order_id: str, payment_id: str, signature: str) -> bool:
        message = f"{order_id}|{payment_id}".encode()
        expected = hmac.new(self.key_secret.encode(), message, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, signature)

    def create_payout(self, recipient_id: str, amount: Decimal, currency: str) -> dict:
        # Payouts require RazorpayX; keep sandbox-style record for platform flow
        return {
            "provider_payout_id": f"rp_po_{uuid4().hex[:14]}",
            "recipient_id": recipient_id,
            "amount": str(amount),
            "currency": currency,
            "status": "pending",
            "paid_at": None,
        }


def get_payment_provider():
    mode = (os.getenv("PAYMENT_MODE") or "sandbox").lower()
    key = os.getenv("RAZORPAY_KEY_ID") or os.getenv("PAYMENT_PROVIDER_KEY") or ""
    secret = os.getenv("RAZORPAY_KEY_SECRET") or os.getenv("PAYMENT_PROVIDER_SECRET") or ""
    if mode in {"razorpay", "live"} and key and secret:
        logger.info("Using Razorpay payment provider")
        return RazorpayPaymentProvider(key, secret)
    return SandboxPaymentProvider()
