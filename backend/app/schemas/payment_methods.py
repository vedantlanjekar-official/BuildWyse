"""Payment method schemas (bank + card)."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel

MethodType = Literal["bank", "card"]
CardType = Literal["visa", "mastercard", "rupay", "amex", "other"]


class PaymentMethodCreate(BaseModel):
    method_type: MethodType
    label: str | None = None
    bank_name: str | None = None
    bank_branch: str | None = None
    account_holder_name: str | None = None
    account_number: str | None = None
    ifsc_code: str | None = None
    card_type: CardType | None = None
    card_number: str | None = None
    card_expiry: str | None = None
    is_autopay: bool = False


class PaymentMethodUpdate(BaseModel):
    label: str | None = None
    bank_name: str | None = None
    bank_branch: str | None = None
    account_holder_name: str | None = None
    account_number: str | None = None
    ifsc_code: str | None = None
    card_type: CardType | None = None
    card_number: str | None = None
    card_expiry: str | None = None
    is_autopay: bool | None = None


class PaymentMethodResponse(ORMModel):
    id: UUID
    user_id: UUID
    method_type: str
    label: str | None = None
    bank_name: str | None = None
    bank_branch: str | None = None
    account_holder_name: str | None = None
    account_number: str | None = None
    ifsc_code: str | None = None
    card_type: str | None = None
    card_number: str | None = None
    card_expiry: str | None = None
    is_autopay: bool = False
    created_at: datetime
    updated_at: datetime | None = None
