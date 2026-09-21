"""Public contact form schemas."""

from typing import Literal

from pydantic import BaseModel, EmailStr, Field

ContactPurpose = Literal[
    "feedback",
    "collaboration",
    "investor",
    "partnership",
    "support",
    "press",
    "other",
]


class ContactMessageCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    purpose: ContactPurpose
    comment: str = Field(min_length=5, max_length=4000)


class ContactMessageResponse(BaseModel):
    status: str
    message: str
