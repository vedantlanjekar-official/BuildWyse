"""Unit tests for payment commission and idempotency."""

from decimal import Decimal
from uuid import uuid4

import pytest

from app.repositories.memory_store import get_memory_store
from app.services.payment_service import compute_commission, payment_service


@pytest.fixture(autouse=True)
def reset_memory(monkeypatch):
    import app.repositories.memory_store as ms
    import app.repositories.supabase_client as sc
    from app.core.config import get_settings

    monkeypatch.setenv("FORCE_MEMORY_STORE", "true")
    get_settings.cache_clear()
    sc._supabase_client = None
    sc._using_memory = False
    ms._memory_store = None
    yield
    ms._memory_store = None
    sc._supabase_client = None
    get_settings.cache_clear()


def test_compute_commission_default_rate():
    result = compute_commission(Decimal("100000"))
    assert result["commission_rate"] == Decimal("0.10")
    assert result["commission_amount"] == Decimal("10000.00")
    assert result["net_payout"] == Decimal("90000.00")


def test_compute_commission_custom_rate():
    result = compute_commission(Decimal("50000"), rate=Decimal("0.15"))
    assert result["commission_amount"] == Decimal("7500.00")
    assert result["net_payout"] == Decimal("42500.00")


def test_payment_flow_creates_order_commission_payout():
    store = get_memory_store()
    client_id = str(uuid4())
    project = store.insert("projects", {"client_id": client_id, "title": "Pay Test", "state": "EXECUTION"})

    order = payment_service.create_order(
        client_id,
        {"project_id": project["id"], "order_type": "milestone", "amount": Decimal("10000"), "currency": "INR"},
    )
    assert order["status"] == "created"

    recipient = str(uuid4())
    result = payment_service.approve_and_payout(
        payment_order_id=order["id"],
        recipient_id=recipient,
        actor_id=client_id,
        idempotency_key="test-key-001",
    )
    assert result["idempotent_replay"] is False
    assert result["payment_id"] is not None
    assert result["payout_id"] is not None
    assert Decimal(result["commission"]["commission_amount"]) == Decimal("1000.00")


def test_payment_idempotency_replay():
    store = get_memory_store()
    client_id = str(uuid4())
    project = store.insert("projects", {"client_id": client_id, "title": "Idempotent", "state": "EXECUTION"})
    order = payment_service.create_order(
        client_id,
        {"project_id": project["id"], "order_type": "milestone", "amount": Decimal("5000"), "currency": "INR"},
    )
    recipient = str(uuid4())
    key = "idem-key-xyz"
    first = payment_service.approve_and_payout(
        payment_order_id=order["id"],
        recipient_id=recipient,
        actor_id=client_id,
        idempotency_key=key,
    )
    with pytest.raises(ValueError):
        payment_service.approve_and_payout(
            payment_order_id=order["id"],
            recipient_id=recipient,
            actor_id=client_id,
            idempotency_key=None,
        )
    second = payment_service.approve_and_payout(
        payment_order_id=order["id"],
        recipient_id=recipient,
        actor_id=client_id,
        idempotency_key=key,
    )
    assert second["idempotent_replay"] is True
    assert second["payment_id"] == first["payment_id"]
