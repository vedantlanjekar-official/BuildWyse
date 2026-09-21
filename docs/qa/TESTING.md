# BuildWyse Testing Guide

## Test pyramid

```
        ┌─────────────┐
        │  E2E smoke  │  Manual / lifecycle_smoke.md
        ├─────────────┤
        │  Integration │  Future: Supabase + JWT tests
        ├─────────────┤
        │  Unit tests  │  pytest (21+ tests)
        └─────────────┘
```

---

## Backend unit tests

Location: `backend/tests/`

| File | Coverage |
|------|----------|
| `test_state_machine.py` | Project lifecycle FSM (7 tests) |
| `test_matching_score.py` | Jaccard scoring, embedding hook (5 tests) |
| `test_payment_commission.py` | Commission calc, payment flow, idempotency (4 tests) |
| `test_assm_classifier.py` | After-sales vs new-project classification (5 tests) |
| `test_security_roles.py` | ADMIN role mapping in `DB_ROLE_MAP` (3 tests) |

### Run

```powershell
cd backend
uv run pytest tests -q
```

All tests force memory mode via `conftest.py`:

```python
os.environ["FORCE_MEMORY_STORE"] = "true"
os.environ["AI_MODE"] = "stub"
```

No network or Supabase credentials required.

### Expected output

```
21 passed   # (+3 from test_security_roles.py = 24 total after addition)
```

---

## Frontend build verification

```powershell
cd frontend
npm run build
```

Validates TypeScript compilation and Vite production bundle.

Expected: `✓ built` with output in `dist/`.

---

## E2E smoke test

Manual walkthrough documented in [tests/e2e/lifecycle_smoke.md](../../tests/e2e/lifecycle_smoke.md).

Covers:

- Demo auth (`X-Dev-User-Id`)
- Project creation
- Lifecycle transitions
- AI stub responses
- Matching run
- Payment sandbox
- Certificate issuance

---

## RLS testing

Documented in [tests/security/test_rls_notes.md](../../tests/security/test_rls_notes.md).

Requires live Supabase with:

- Applied RLS policies
- Seeded Auth users per role
- Anon key + user JWT (not service role)

Not yet automated in pytest.

---

## Environment matrix

| Profile | `FORCE_MEMORY_STORE` | `DEBUG` | `AI_MODE` | Use |
|---------|---------------------|---------|-----------|-----|
| Unit tests | `true` | any | `stub` | pytest |
| Local demo | `true` | `true` | `stub` | UI dev |
| Staging | `false` | `false` | `live` | Pre-prod |
| Production | `false` | `false` | `live` | Live |

---

## Adding tests

### Unit test conventions

- Place in `backend/tests/test_<domain>.py`
- Use `conftest.py` memory fixtures (auto-applied)
- No external API calls
- Assert business logic, not HTTP layer (unless integration test added)

### Example

```python
def test_admin_role_mapping():
    assert map_db_role("admin") == Role.ADMIN
```

---

## QA report

Final validation results: [BUILDWYSE_FINAL_QA_REPORT.md](./BUILDWYSE_FINAL_QA_REPORT.md)

---

## Related

- [../architecture/SECURITY.md](../architecture/SECURITY.md)
- [../../tests/e2e/lifecycle_smoke.md](../../tests/e2e/lifecycle_smoke.md)
