"""CRUD for user payment methods (bank accounts + cards)."""

from __future__ import annotations

import re
from uuid import uuid4

from app.repositories.supabase_client import Repository
from app.services.profile_service import IFSC_RE, CARD_EXPIRY_RE, mask_sensitive

payment_methods_repo = Repository("payment_methods")


def serialize_method(row: dict) -> dict:
    out = dict(row)
    out["account_number"] = mask_sensitive(out.get("account_number"))
    out["card_number"] = mask_sensitive(out.get("card_number"))
    out["is_autopay"] = bool(out.get("is_autopay"))
    return out


def _validate_payload(method_type: str, payload: dict) -> dict:
    data = {k: v for k, v in payload.items() if v is not None}
    data.pop("card_cvc", None)
    data.pop("cvc", None)

    if method_type == "bank":
        if not data.get("bank_name"):
            raise ValueError("Bank name is required")
        if not data.get("account_holder_name"):
            raise ValueError("Account holder name is required")
        if data.get("account_number"):
            digits = re.sub(r"\D", "", str(data["account_number"]))
            if len(digits) < 8 or len(digits) > 18:
                raise ValueError("Account number must be 8–18 digits")
            data["account_number"] = digits
        else:
            raise ValueError("Account number is required")
        if data.get("ifsc_code"):
            code = str(data["ifsc_code"]).strip().upper()
            if not IFSC_RE.match(code):
                raise ValueError("IFSC must look like HDFC0001234")
            data["ifsc_code"] = code
        else:
            raise ValueError("IFSC code is required")
    elif method_type == "card":
        if not data.get("card_type"):
            raise ValueError("Card type is required")
        if data.get("card_number"):
            digits = re.sub(r"\D", "", str(data["card_number"]))
            if len(digits) < 12 or len(digits) > 19:
                raise ValueError("Card number must be 12–19 digits")
            data["card_number"] = digits
        else:
            raise ValueError("Card number is required")
        if data.get("card_expiry"):
            expiry = str(data["card_expiry"]).strip()
            if not CARD_EXPIRY_RE.match(expiry):
                raise ValueError("Card expiry must be MM/YY")
            data["card_expiry"] = expiry
        else:
            raise ValueError("Card expiry is required")
    else:
        raise ValueError("method_type must be bank or card")

    return data


def list_methods(user_id: str) -> list[dict]:
    rows = payment_methods_repo.list(filters={"user_id": user_id}, limit=100)
    rows.sort(key=lambda r: (not bool(r.get("is_autopay")), str(r.get("created_at") or "")), reverse=False)
    return [serialize_method(r) for r in rows]


def create_method(user_id: str, payload: dict) -> dict:
    method_type = payload.get("method_type")
    if method_type not in {"bank", "card"}:
        raise ValueError("method_type must be bank or card")
    data = _validate_payload(method_type, payload)
    is_autopay = bool(payload.get("is_autopay"))
    if is_autopay:
        _clear_autopay(user_id)
    row = payment_methods_repo.insert(
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "method_type": method_type,
            "label": payload.get("label") or _default_label(method_type, data),
            "bank_name": data.get("bank_name"),
            "bank_branch": data.get("bank_branch"),
            "account_holder_name": data.get("account_holder_name"),
            "account_number": data.get("account_number"),
            "ifsc_code": data.get("ifsc_code"),
            "card_type": data.get("card_type"),
            "card_number": data.get("card_number"),
            "card_expiry": data.get("card_expiry"),
            "is_autopay": is_autopay,
        }
    )
    return serialize_method(row)


def set_autopay(user_id: str, method_id: str) -> dict:
    row = payment_methods_repo.get(method_id)
    if not row or str(row.get("user_id")) != user_id:
        raise LookupError("Payment method not found")
    if row.get("method_type") != "card":
        raise ValueError("Only cards can be selected for auto-pay")
    _clear_autopay(user_id)
    updated = payment_methods_repo.update(method_id, {"is_autopay": True}) or {
        **row,
        "is_autopay": True,
    }
    return serialize_method(updated)


def delete_method(user_id: str, method_id: str) -> None:
    row = payment_methods_repo.get(method_id)
    if not row or str(row.get("user_id")) != user_id:
        raise LookupError("Payment method not found")
    payment_methods_repo.delete(method_id)


def _clear_autopay(user_id: str) -> None:
    rows = payment_methods_repo.list(filters={"user_id": user_id}, limit=100)
    for row in rows:
        if row.get("is_autopay"):
            payment_methods_repo.update(row["id"], {"is_autopay": False})


def _default_label(method_type: str, data: dict) -> str:
    if method_type == "bank":
        return f"{data.get('bank_name') or 'Bank'} ••••{(data.get('account_number') or '')[-4:]}"
    return f"{(data.get('card_type') or 'Card').title()} ••••{(data.get('card_number') or '')[-4:]}"
