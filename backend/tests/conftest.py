import os
os.environ["FORCE_MEMORY_STORE"] = "true"
os.environ["AI_MODE"] = "stub"

import pytest
from app.core.config import get_settings

@pytest.fixture(autouse=True)
def _force_memory(monkeypatch):
    monkeypatch.setenv("FORCE_MEMORY_STORE", "true")
    get_settings.cache_clear()
    import app.repositories.supabase_client as sc
    import app.repositories.memory_store as ms
    sc._supabase_client = None
    sc._using_memory = False
    ms._memory_store = None
    yield
    ms._memory_store = None
    sc._supabase_client = None
    get_settings.cache_clear()
