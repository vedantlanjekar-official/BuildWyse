"""Organization endpoints."""

from uuid import uuid4

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field

from app.core.security import AuthUser
from app.dependencies.auth import get_current_user
from app.repositories.memory_store import get_memory_store

router = APIRouter()


class OrganizationCreate(BaseModel):
    name: str = Field(..., min_length=2)
    org_type: str = "enterprise"
    description: str | None = None


@router.get("")
async def list_organizations(user: AuthUser = Depends(get_current_user)):
    store = get_memory_store()
    return store.list("organizations", limit=100)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_organization(body: OrganizationCreate, user: AuthUser = Depends(get_current_user)):
    store = get_memory_store()
    slug = body.name.lower().replace(" ", "-")[:50]
    row = store.insert(
        "organizations",
        {
            "name": body.name,
            "slug": slug,
            "org_type": body.org_type,
            "owner_id": user.id,
            "description": body.description,
            "verification_status": "pending",
        },
    )
    return row
