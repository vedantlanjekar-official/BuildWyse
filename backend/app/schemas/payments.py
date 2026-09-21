"""Payment schemas."""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class PaymentOrderCreate(BaseModel):
    project_id: UUID
    order_type: str = Field(..., pattern="^(documentation|milestone|change_request|after_sales|platform_fee)$")
    amount: Decimal = Field(..., gt=0)
    currency: str = "INR"
    milestone_id: UUID | None = None
    recipient_id: UUID | None = None
    metadata: dict = Field(default_factory=dict)


class PaymentOrderResponse(ORMModel):
    id: UUID
    project_id: UUID
    client_id: UUID
    order_type: str
    amount: Decimal
    currency: str
    status: str
    provider_order_id: str | None = None
    created_at: datetime


class PaymentApproveRequest(BaseModel):
    payment_order_id: UUID
    recipient_id: UUID


class CommissionBreakdown(BaseModel):
    gross_amount: Decimal
    commission_rate: Decimal
    commission_amount: Decimal
    net_payout: Decimal


class PaymentFlowResponse(BaseModel):
    payment_order: PaymentOrderResponse
    payment_id: UUID | None = None
    commission: CommissionBreakdown | None = None
    payout_id: UUID | None = None
    idempotent_replay: bool = False
