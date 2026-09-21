"""User and profile schemas."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.core.security import Role
from app.schemas.common import ORMModel

GovernmentIdType = Literal["aadhaar", "pan", "passport", "driving_license", "voter_id"]
CardType = Literal["visa", "mastercard", "rupay", "amex", "other"]


class ProfileBase(BaseModel):
    email: EmailStr
    full_name: str | None = None
    phone: str | None = None
    avatar_url: str | None = None
    account_type: str = "client"
    timezone: str = "UTC"
    locale: str = "en"


class ProfileCreate(ProfileBase):
    pass


class ProfileUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    avatar_url: str | None = None
    country: str | None = None
    address: str | None = None
    address_line1: str | None = None
    address_line2: str | None = None
    state: str | None = None
    city: str | None = None
    pincode: str | None = None
    timezone: str | None = None
    locale: str | None = None
    aadhaar_number: str | None = None
    bank_name: str | None = None
    bank_branch: str | None = None
    account_holder_name: str | None = None
    account_number: str | None = None
    ifsc_code: str | None = None
    card_type: CardType | None = None
    card_number: str | None = None
    card_expiry: str | None = None


class ProfileResponse(ORMModel):
    id: UUID
    email: str
    full_name: str | None = None
    phone: str | None = None
    avatar_url: str | None = None
    account_type: str
    verification_status: str = "unverified"
    country: str | None = None
    address: str | None = None
    address_line1: str | None = None
    address_line2: str | None = None
    state: str | None = None
    city: str | None = None
    pincode: str | None = None
    email_verified: bool = False
    phone_verified: bool = False
    government_id_verified: bool = False
    government_id_type: str | None = None
    government_id_number: str | None = None
    aadhaar_number: str | None = None
    government_id_url: str | None = None
    bank_name: str | None = None
    bank_branch: str | None = None
    account_holder_name: str | None = None
    account_number: str | None = None
    ifsc_code: str | None = None
    card_type: str | None = None
    card_number: str | None = None
    card_expiry: str | None = None
    is_fully_verified: bool = False
    roles: list[Role] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime | None = None


class UserRoleResponse(ORMModel):
    id: UUID
    user_id: UUID
    role: str
    granted_at: datetime


class OtpSendRequest(BaseModel):
    channel: Literal["email", "phone"]


class OtpVerifyRequest(BaseModel):
    channel: Literal["email", "phone"]
    code: str = Field(min_length=4, max_length=8)


class OtpSendResponse(BaseModel):
    status: str
    channel: str
    destination: str
    expires_in_seconds: int
    debug_code: str | None = None


class MediaUploadRequest(BaseModel):
    filename: str
    content_type: str = "image/jpeg"
    data_base64: str = Field(min_length=20)


class GovernmentIdSubmitRequest(BaseModel):
    id_type: GovernmentIdType = "aadhaar"
    id_number: str = Field(min_length=4, max_length=30)
    filename: str
    content_type: str = "image/jpeg"
    data_base64: str = Field(min_length=20)
