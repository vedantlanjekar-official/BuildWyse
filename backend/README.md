# BuildWyse Backend

FastAPI backend for the BuildWyse project execution platform.

## Stack

- Python 3.12
- FastAPI + Pydantic v2
- Supabase (PostgreSQL) with in-memory fallback
- OpenAI (optional, `AI_MODE=live`)
- Sandbox payments (no real money)

## Setup

```powershell
cd backend
uv venv
uv pip install -r requirements.txt
```

Copy environment variables from the repo root `.env.example` into `../.env` or `backend/.env`:

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (preferred for server ops) |
| `SUPABASE_JWT_SECRET` | JWT secret for Bearer token validation |
| `OPENAI_API_KEY` | Optional, for live AI |
| `AI_MODE` | `stub` (default) or `live` |
| `FRONTEND_URL` | CORS origin |
| `BACKEND_URL` | API base URL |
| `PLATFORM_COMMISSION_RATE` | Default `0.10` |

If `SUPABASE_SERVICE_ROLE_KEY` is empty, the client falls back to the anon key and logs a warning (RLS may restrict writes).

Without Supabase credentials, the API runs in **memory mode** with seeded demo data.

## Run

```powershell
cd backend
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- Health: `GET /health`
- OpenAPI: `GET /docs`
- API base: `/api/v1`

## Auth

Send Supabase JWT:

```
Authorization: Bearer <access_token>
```

In debug mode with memory store, you may use `X-Dev-User-Id: <profile-uuid>` when JWT is unavailable.

## Tests

```powershell
cd backend
python -m pytest tests -q
```

Unit tests cover state machine, matching scores, payment commission, and ASSM classifier (no network).

## Packages

- `backend/app/` — FastAPI application
- `../ai/` — AI services (imported via repo root on `sys.path`)
- `../integrations/` — GitHub, sandbox payments, console email, simulated identity

## Key modules

- **State machine** — `app/core/state_machine.py` (server-side transitions only)
- **Matching** — deterministic scoring + optional embedding similarity, top 10
- **Payments** — sandbox orders, commission deduction, idempotent payouts
- **ASSM** — classifies after-sales vs new project by scope/effort/modules thresholds
- **Certificates** — generates `BW-YYYYMMDD-<project>` certificate IDs
- **Audit** — mutation logging via middleware + `audit_service`
