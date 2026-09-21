"""Payment sandbox endpoints."""

from io import BytesIO
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Response, status
from pydantic import BaseModel
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

from app.core.security import AuthUser
from app.dependencies.auth import get_current_user
from app.repositories.supabase_client import milestones_repo, payment_orders_repo, payments_repo, phases_repo
from app.schemas.payments import PaymentApproveRequest, PaymentFlowResponse, PaymentOrderCreate, PaymentOrderResponse
from app.services.payment_service import payment_service
from app.services.project_service import ProjectAccessError, project_service

router = APIRouter()


def _require_project(project_id: UUID | str, user: AuthUser) -> dict:
    try:
        return project_service.get_project(UUID(str(project_id)), user)
    except LookupError:
        raise HTTPException(status_code=404, detail="Project not found")
    except ProjectAccessError:
        raise HTTPException(status_code=403, detail="Access denied")


def _enrich_order(order: dict) -> dict:
    order_id = str(order["id"])
    txns = payments_repo.list(filters={"payment_order_id": order_id}, limit=20)
    txns.sort(key=lambda t: t.get("paid_at") or t.get("created_at") or "", reverse=True)
    latest = txns[0] if txns else None
    meta = order.get("metadata") if isinstance(order.get("metadata"), dict) else {}
    payment_meta = (latest or {}).get("metadata") if isinstance((latest or {}).get("metadata"), dict) else {}

    created = order.get("created_at")
    created_dt = None
    if created:
        try:
            from datetime import datetime

            created_dt = datetime.fromisoformat(str(created).replace("Z", "+00:00"))
        except ValueError:
            created_dt = None

    return {
        **order,
        "description": meta.get("description")
        or meta.get("purpose")
        or order.get("order_type")
        or "Payment order",
        "phase_name": meta.get("phase_name"),
        "milestone_title": meta.get("milestone_title"),
        "transaction": {
            "transaction_id": (latest or {}).get("provider_payment_id")
            or order.get("provider_order_id")
            or order.get("id"),
            "payment_id": (latest or {}).get("id"),
            "amount": (latest or {}).get("amount") or order.get("amount"),
            "currency": order.get("currency") or "INR",
            "status": (latest or {}).get("status") or order.get("status"),
            "payment_method": (latest or {}).get("payment_method")
            or payment_meta.get("payment_method")
            or meta.get("payment_method")
            or "sandbox",
            "provider": (latest or {}).get("provider") or order.get("provider") or "sandbox",
            "bank_name": payment_meta.get("bank_name") or meta.get("bank_name") or "BuildWyse Sandbox Bank",
            "upi_id": payment_meta.get("upi_id") or meta.get("upi_id") or "client@buildwyse",
            "account_last4": payment_meta.get("account_last4") or meta.get("account_last4") or "4242",
            "paid_at": (latest or {}).get("paid_at"),
            "created_at": order.get("created_at"),
            "date": created_dt.strftime("%Y-%m-%d") if created_dt else None,
            "day": created_dt.strftime("%A") if created_dt else None,
            "time": created_dt.strftime("%I:%M %p") if created_dt else None,
        },
        "payments": txns,
    }


def _build_receipt_pdf(order: dict, project_title: str) -> tuple[bytes, str]:
    enriched = _enrich_order(order)
    txn = enriched.get("transaction") or {}
    currency = str(txn.get("currency") or enriched.get("currency") or "INR")
    amount = txn.get("amount") or enriched.get("amount") or 0
    try:
        amount_label = f"{currency} {float(amount):,.2f}"
    except (TypeError, ValueError):
        amount_label = f"{currency} {amount}"

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    pdf.setFillColorRGB(0.05, 0.16, 0.16)
    pdf.rect(0, height - 110, width, 110, fill=1, stroke=0)
    pdf.setFillColorRGB(1, 1, 1)
    pdf.setFont("Helvetica-Bold", 22)
    pdf.drawString(48, height - 48, "BuildWyse Payment Receipt")
    pdf.setFont("Helvetica", 11)
    pdf.drawString(48, height - 72, project_title[:70])
    pdf.drawString(48, height - 90, f"Amount: {amount_label}")

    pdf.setFillColorRGB(0.05, 0.16, 0.16)
    y = height - 150
    pdf.setFont("Helvetica-Bold", 13)
    pdf.drawString(48, y, "Transaction details")
    y -= 24

    rows = [
        ("Status", str(txn.get("status") or enriched.get("status") or "—")),
        ("Transaction ID", str(txn.get("transaction_id") or enriched.get("id") or "—")),
        ("Payment ID", str(txn.get("payment_id") or "—")),
        ("Date", str(txn.get("date") or "—")),
        ("Day", str(txn.get("day") or "—")),
        ("Time", str(txn.get("time") or "—")),
        ("Timestamp", str(txn.get("paid_at") or txn.get("created_at") or enriched.get("created_at") or "—")),
        ("Payment method", str(txn.get("payment_method") or "—")),
        ("Provider", str(txn.get("provider") or enriched.get("provider") or "—")),
        ("Bank", str(txn.get("bank_name") or "—")),
        ("UPI ID", str(txn.get("upi_id") or "—")),
        ("Account", f"•••• {txn.get('account_last4')}" if txn.get("account_last4") else "—"),
        ("Order type", str(enriched.get("order_type") or "—")),
        ("Purpose", str(enriched.get("description") or "—")),
        ("Phase", str(enriched.get("phase_name") or "—")),
        ("Milestone", str(enriched.get("milestone_title") or "—")),
    ]

    pdf.setFont("Helvetica", 10)
    for label, value in rows:
        pdf.setFillColorRGB(0.54, 0.61, 0.59)
        pdf.drawString(48, y, label)
        pdf.setFillColorRGB(0.05, 0.16, 0.16)
        pdf.drawRightString(width - 48, y, str(value)[:62])
        y -= 18
        if y < 72:
            pdf.showPage()
            y = height - 72
            pdf.setFont("Helvetica", 10)

    pdf.setFillColorRGB(0.54, 0.61, 0.59)
    pdf.setFont("Helvetica", 8)
    pdf.drawCentredString(width / 2, 36, "Generated by BuildWyse · Official payment receipt")
    pdf.save()

    short_id = str(enriched.get("id") or "receipt")[:8]
    filename = f"BuildWyse_Receipt_{short_id}.pdf"
    return buffer.getvalue(), filename


@router.get("/project/{project_id}")
async def list_project_payments(project_id: UUID, user: AuthUser = Depends(get_current_user)):
    _require_project(project_id, user)
    orders = payment_orders_repo.list(filters={"project_id": str(project_id)}, limit=200)
    orders.sort(key=lambda r: r.get("created_at") or "", reverse=True)
    enriched_orders = [_enrich_order(o) for o in orders]

    phases = phases_repo.list(filters={"project_id": str(project_id)}, limit=100)
    phases.sort(key=lambda p: p.get("phase_number") or 0)
    milestones = milestones_repo.list(filters={"project_id": str(project_id)}, limit=200)

    phase_payments = []
    for phase in phases:
        phase_id = str(phase["id"])
        phase_ms = [m for m in milestones if str(m.get("phase_id")) == phase_id]
        amount = sum(float(m.get("payment_amount") or 0) for m in phase_ms)
        if amount <= 0:
            try:
                amount = float(payment_service.phase_amount(str(project_id), phase_id))
            except Exception:
                amount = 0
        related_orders = [
            o
            for o in enriched_orders
            if str((o.get("metadata") or {}).get("phase_id") or "") == phase_id
            or any(str(m.get("id")) == str((o.get("metadata") or {}).get("milestone_id") or "") for m in phase_ms)
        ]
        paid_amount = sum(
            float(o.get("amount") or 0)
            for o in related_orders
            if str(o.get("status")) in {"paid", "completed", "captured"}
        )
        phase_payments.append(
            {
                "phase_id": phase_id,
                "phase_number": phase.get("phase_number"),
                "phase_name": phase.get("name"),
                "phase_status": phase.get("status"),
                "planned_amount": amount,
                "currency": (phase_ms[0].get("currency") if phase_ms else None) or "INR",
                "milestone_count": len(phase_ms),
                "milestones": [
                    {
                        "id": m.get("id"),
                        "title": m.get("title"),
                        "amount": m.get("payment_amount"),
                        "currency": m.get("currency") or "INR",
                        "status": m.get("status"),
                        "due_date": m.get("due_date"),
                    }
                    for m in phase_ms
                ],
                "paid_amount": paid_amount,
                "is_paid": paid_amount > 0
                or any(str(o.get("status")) in {"paid", "completed", "captured"} for o in related_orders),
                "can_pay": str(phase.get("status")) in {"approved", "completed"}
                and not (
                    paid_amount > 0
                    or any(str(o.get("status")) in {"paid", "completed", "captured"} for o in related_orders)
                ),
                "orders": related_orders,
            }
        )

    return {
        "orders": enriched_orders,
        "phase_payments": phase_payments,
        "totals": {
            "order_count": len(enriched_orders),
            "paid_count": len(
                [o for o in enriched_orders if str(o.get("status")) in {"paid", "completed", "captured"}]
            ),
            "planned_phase_amount": sum(float(p.get("planned_amount") or 0) for p in phase_payments),
            "paid_amount": sum(
                float(o.get("amount") or 0)
                for o in enriched_orders
                if str(o.get("status")) in {"paid", "completed", "captured"}
            ),
        },
    }


@router.get("/orders/{order_id}")
async def get_payment_order(order_id: UUID, user: AuthUser = Depends(get_current_user)):
    order = payment_orders_repo.get(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Payment order not found")
    _require_project(UUID(str(order["project_id"])), user)
    return _enrich_order(order)


@router.get("/orders/{order_id}/receipt.pdf")
async def download_payment_receipt(order_id: UUID, user: AuthUser = Depends(get_current_user)):
    order = payment_orders_repo.get(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Payment order not found")
    project = _require_project(UUID(str(order["project_id"])), user)
    project_title = str(project.get("title") or "BuildWyse Project")
    pdf_bytes, filename = _build_receipt_pdf(order, project_title)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/orders", response_model=PaymentOrderResponse, status_code=status.HTTP_201_CREATED)
async def create_payment_order(body: PaymentOrderCreate, user: AuthUser = Depends(get_current_user)):
    try:
        order = payment_service.create_order(user.id, body.model_dump())
    except LookupError:
        raise HTTPException(status_code=404, detail="Project not found")
    return PaymentOrderResponse.model_validate(order)


@router.post("/phase/{phase_id}/checkout")
async def checkout_phase_payment(phase_id: UUID, user: AuthUser = Depends(get_current_user)):
    """Create a Razorpay/sandbox checkout session for a phase payment."""
    phase = phases_repo.get(phase_id)
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")
    _require_project(UUID(str(phase["project_id"])), user)
    try:
        result = payment_service.create_phase_checkout(user.id, str(phase_id))
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return result


class CheckoutCompleteBody(BaseModel):
    payment_order_id: UUID
    razorpay_payment_id: str | None = None
    razorpay_order_id: str | None = None
    razorpay_signature: str | None = None


@router.post("/checkout/complete")
async def complete_checkout(body: CheckoutCompleteBody, user: AuthUser = Depends(get_current_user)):
    order = payment_orders_repo.get(body.payment_order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Payment order not found")
    _require_project(UUID(str(order["project_id"])), user)
    try:
        result = payment_service.complete_checkout(
            payment_order_id=str(body.payment_order_id),
            actor_id=user.id,
            provider_payment_id=body.razorpay_payment_id,
            razorpay_signature=body.razorpay_signature,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except LookupError:
        raise HTTPException(status_code=404, detail="Payment order not found")
    return result


@router.post("/approve", response_model=PaymentFlowResponse)
async def approve_payment(
    body: PaymentApproveRequest,
    user: AuthUser = Depends(get_current_user),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
):
    try:
        result = payment_service.approve_and_payout(
            payment_order_id=body.payment_order_id,
            recipient_id=str(body.recipient_id),
            actor_id=user.id,
            idempotency_key=idempotency_key,
        )
    except LookupError:
        raise HTTPException(status_code=404, detail="Payment order not found")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return PaymentFlowResponse(
        payment_order=PaymentOrderResponse.model_validate(result["payment_order"]),
        payment_id=UUID(str(result["payment_id"])) if result.get("payment_id") else None,
        commission=result.get("commission"),
        payout_id=UUID(str(result["payout_id"])) if result.get("payout_id") else None,
        idempotent_replay=result.get("idempotent_replay", False),
    )
