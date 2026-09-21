"""User payment methods endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.core.security import AuthUser
from app.dependencies.auth import get_current_user
from app.schemas.payment_methods import PaymentMethodCreate, PaymentMethodResponse
from app.services import payment_method_service

router = APIRouter()


@router.get("/me/payment-methods", response_model=list[PaymentMethodResponse])
async def list_payment_methods(user: AuthUser = Depends(get_current_user)):
    return [PaymentMethodResponse.model_validate(r) for r in payment_method_service.list_methods(user.id)]


@router.post("/me/payment-methods", response_model=PaymentMethodResponse)
async def create_payment_method(body: PaymentMethodCreate, user: AuthUser = Depends(get_current_user)):
    try:
        row = payment_method_service.create_method(user.id, body.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return PaymentMethodResponse.model_validate(row)


@router.post("/me/payment-methods/{method_id}/autopay", response_model=PaymentMethodResponse)
async def set_autopay(method_id: UUID, user: AuthUser = Depends(get_current_user)):
    try:
        row = payment_method_service.set_autopay(user.id, str(method_id))
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return PaymentMethodResponse.model_validate(row)


@router.delete("/me/payment-methods/{method_id}")
async def delete_payment_method(method_id: UUID, user: AuthUser = Depends(get_current_user)):
    try:
        payment_method_service.delete_method(user.id, str(method_id))
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"status": "deleted"}
