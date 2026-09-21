"""Payment flow with Razorpay/sandbox provider, commission and phase checkout."""

from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID

from app.core.config import get_settings
from app.repositories.supabase_client import (
    commissions_repo,
    milestones_repo,
    payment_orders_repo,
    payments_repo,
    payouts_repo,
    phases_repo,
    projects_repo,
)
from app.services.audit_service import audit_service
from app.utils.idempotency import check_idempotency, store_idempotency
from integrations.payments.provider import get_payment_provider


def _quantize(amount: Decimal) -> Decimal:
    return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def compute_commission(gross: Decimal, rate: Decimal | None = None) -> dict:
    settings = get_settings()
    commission_rate = Decimal(str(rate if rate is not None else settings.platform_commission_rate))
    commission_amount = _quantize(gross * commission_rate)
    net_payout = _quantize(gross - commission_amount)
    return {
        "gross_amount": gross,
        "commission_rate": commission_rate,
        "commission_amount": commission_amount,
        "net_payout": net_payout,
    }


class PaymentService:
    def __init__(self) -> None:
        self.provider = get_payment_provider()

    def create_order(self, client_id: str, data: dict) -> dict:
        project = projects_repo.get(data["project_id"])
        if not project:
            raise LookupError("Project not found")

        metadata = dict(data.get("metadata") or {})
        if data.get("milestone_id"):
            metadata["milestone_id"] = str(data["milestone_id"])

        provider_result = self.provider.create_order(
            amount=Decimal(str(data["amount"])),
            currency=data.get("currency", "INR"),
            metadata={
                "project_id": str(data["project_id"]),
                "order_type": data["order_type"],
                **{k: str(v) for k, v in metadata.items()},
            },
        )

        order = payment_orders_repo.insert(
            {
                "project_id": str(data["project_id"]),
                "client_id": client_id,
                "order_type": data["order_type"],
                "amount": str(data["amount"]),
                "currency": data.get("currency", "INR"),
                "status": "created",
                "provider": provider_result.get("provider") or "sandbox",
                "provider_order_id": provider_result["provider_order_id"],
                "metadata": {
                    **metadata,
                    "checkout": provider_result.get("checkout") or {},
                },
            }
        )
        audit_service.log(
            actor_id=client_id,
            action="payment_order.create",
            entity_type="payment_order",
            entity_id=order["id"],
            project_id=data["project_id"],
            new_values=order,
        )
        return {**order, "checkout": provider_result.get("checkout") or {}}

    def phase_amount(self, project_id: str, phase_id: str) -> Decimal:
        milestones = milestones_repo.list(filters={"phase_id": phase_id}, limit=100)
        amount = sum(Decimal(str(m.get("payment_amount") or 0)) for m in milestones)
        if amount > 0:
            return _quantize(amount)
        phases = phases_repo.list(filters={"project_id": project_id}, limit=100)
        project = projects_repo.get(project_id) or {}
        budget = Decimal(str(project.get("estimated_budget") or 0))
        if budget > 0 and phases:
            return _quantize(budget / Decimal(len(phases)))
        return Decimal("40000.00")

    def create_phase_checkout(self, client_id: str, phase_id: str) -> dict:
        phase = phases_repo.get(phase_id)
        if not phase:
            raise LookupError("Phase not found")
        project_id = str(phase["project_id"])
        project = projects_repo.get(project_id)
        if not project:
            raise LookupError("Project not found")

        amount = self.phase_amount(project_id, str(phase_id))
        description = f"Phase {phase.get('phase_number')} — {phase.get('name')} payment"
        order = self.create_order(
            client_id,
            {
                "project_id": project_id,
                "order_type": "milestone",
                "amount": amount,
                "currency": project.get("currency") or "INR",
                "metadata": {
                    "phase_id": str(phase_id),
                    "phase_number": phase.get("phase_number"),
                    "phase_name": phase.get("name"),
                    "description": description,
                    "purpose": description,
                },
            },
        )
        return {
            "order": order,
            "checkout": order.get("checkout")
            or (order.get("metadata") or {}).get("checkout")
            or {},
            "phase": phase,
            "amount": str(amount),
            "currency": project.get("currency") or "INR",
        }

    def complete_checkout(
        self,
        *,
        payment_order_id: str,
        actor_id: str,
        provider_payment_id: str | None = None,
        razorpay_signature: str | None = None,
    ) -> dict:
        order = payment_orders_repo.get(payment_order_id)
        if not order:
            raise LookupError("Payment order not found")
        if order.get("status") in {"paid", "completed", "captured"}:
            return {"payment_order": order, "already_paid": True}

        provider = self.provider
        provider_order_id = str(order.get("provider_order_id") or "")
        if (
            getattr(provider, "verify_signature", None)
            and provider_payment_id
            and razorpay_signature
            and provider_order_id
        ):
            if not provider.verify_signature(provider_order_id, provider_payment_id, razorpay_signature):
                raise ValueError("Invalid Razorpay payment signature")

        gross = Decimal(str(order["amount"]))
        provider_payment = provider.capture_payment(provider_order_id, gross)
        if provider_payment_id:
            provider_payment["provider_payment_id"] = provider_payment_id

        payment = payments_repo.insert(
            {
                "payment_order_id": str(payment_order_id),
                "project_id": order["project_id"],
                "payer_id": order["client_id"],
                "amount": str(gross),
                "currency": order.get("currency", "INR"),
                "status": "succeeded",
                "provider": order.get("provider") or "sandbox",
                "provider_payment_id": provider_payment["provider_payment_id"],
                "paid_at": provider_payment.get("paid_at"),
                "payment_method": "razorpay" if order.get("provider") == "razorpay" else "sandbox",
            }
        )
        payment_orders_repo.update(payment_order_id, {"status": "paid"})
        updated = payment_orders_repo.get(payment_order_id) or {**order, "status": "paid"}

        # Unlock next phase: mark current approved phase completed if needed
        meta = order.get("metadata") if isinstance(order.get("metadata"), dict) else {}
        phase_id = meta.get("phase_id")
        if phase_id:
            phase = phases_repo.get(phase_id)
            if phase and str(phase.get("status")) in {"approved", "completed"}:
                phases_repo.update(phase_id, {"status": "completed"})

        audit_service.log(
            actor_id=actor_id,
            action="payment.checkout_complete",
            entity_type="payment",
            entity_id=payment["id"],
            project_id=order["project_id"],
            new_values={"order_id": payment_order_id, "payment_id": payment["id"]},
        )
        return {"payment_order": updated, "payment_id": payment["id"], "already_paid": False}

    def approve_and_payout(
        self,
        *,
        payment_order_id: UUID | str,
        recipient_id: str,
        actor_id: str,
        idempotency_key: str | None = None,
    ) -> dict:
        scope = "payment.approve"
        payload = {
            "payment_order_id": str(payment_order_id),
            "recipient_id": recipient_id,
        }
        if idempotency_key:
            cached = check_idempotency(scope, idempotency_key, payload)
            if cached:
                cached["idempotent_replay"] = True
                return cached

        order = payment_orders_repo.get(payment_order_id)
        if not order:
            raise LookupError("Payment order not found")
        if order.get("status") == "paid":
            raise ValueError("Payment order already paid")

        completed = self.complete_checkout(payment_order_id=str(payment_order_id), actor_id=actor_id)
        payment_id = completed.get("payment_id")
        order = completed["payment_order"]
        if not payment_id:
            existing = payments_repo.list(filters={"payment_order_id": str(payment_order_id)}, limit=1)
            if not existing:
                raise ValueError("Payment record missing for paid order")
            payment_id = existing[0]["id"]
        gross = Decimal(str(order["amount"]))
        commission = compute_commission(gross)

        commission_row = commissions_repo.insert(
            {
                "payment_id": payment_id,
                "project_id": order["project_id"],
                "commission_rate": str(commission["commission_rate"]),
                "commission_amount": str(commission["commission_amount"]),
                "currency": order.get("currency", "INR"),
                "status": "collected",
            }
        )

        payout_result = self.provider.create_payout(
            recipient_id=recipient_id,
            amount=commission["net_payout"],
            currency=order.get("currency", "INR"),
        )
        payout = payouts_repo.insert(
            {
                "payment_id": payment_id,
                "project_id": order["project_id"],
                "recipient_id": recipient_id,
                "amount": str(commission["net_payout"]),
                "currency": order.get("currency", "INR"),
                "status": "completed",
                "provider": order.get("provider") or "sandbox",
                "provider_payout_id": payout_result["provider_payout_id"],
                "paid_at": payout_result.get("paid_at"),
            }
        )

        result = {
            "payment_order": order,
            "payment_id": payment_id,
            "commission": {
                "gross_amount": str(commission["gross_amount"]),
                "commission_rate": str(commission["commission_rate"]),
                "commission_amount": str(commission["commission_amount"]),
                "net_payout": str(commission["net_payout"]),
            },
            "payout_id": payout["id"],
            "commission_id": commission_row["id"],
            "idempotent_replay": False,
        }

        audit_service.log(
            actor_id=actor_id,
            action="payment.approve_payout",
            entity_type="payment",
            entity_id=payment_id,
            project_id=order["project_id"],
            new_values=result,
        )

        if idempotency_key:
            store_idempotency(scope, idempotency_key, result, payload)

        return result


payment_service = PaymentService()
