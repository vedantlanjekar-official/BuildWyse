# BuildWyse

AI-powered project execution platform connecting verified clients with verified freelancers, teams, and enterprise development resources through a structured project lifecycle.

**Supabase project:** `qeumykfaranencaeewjv`  
**API URL:** `https://qeumykfaranencaeewjv.supabase.co`

> Never commit real API keys. Copy `.env.example` and fill in values from the [Supabase dashboard](https://supabase.com/dashboard/project/qeumykfaranencaeewjv/settings/api).

## Stack summary

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Query, Zustand |
| Backend | Python 3.12, FastAPI, Pydantic v2 |
| Database | Supabase (PostgreSQL 15), pgvector, RLS on 84 tables |
| Auth | Supabase Auth (JWT) + dev header fallback |
| AI | OpenAI (`AI_MODE=live`) or deterministic stubs (`AI_MODE=stub`) |
| Integrations | GitHub OAuth, sandbox payments, console email, simulated identity |
| Deploy targets | Vercel (frontend), Railway (backend), Supabase (DB/Auth) |

## Repository layout

```
BuildWyse/
├── frontend/          # React SPA (Vite)
├── backend/           # FastAPI API server
├── ai/                # 9 AI service modules + prompts
├── integrations/      # GitHub, payments, email, identity
├── database/          # Migrations, RLS policies, seed SQL
├── docs/              # Architecture, API, QA documentation
└── tests/             # E2E smoke guides, RLS notes
```

See also: [BUILDWYSE_MASTER_SPEC.md](./BUILDWYSE_MASTER_SPEC.md) · [000_WORKFLOWS_AND_MODULE_CONNECTIONS.md](./000_WORKFLOWS_AND_MODULE_CONNECTIONS.md)

---

## Quick start — Windows

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- Python 3.12+ with [uv](https://docs.astral.sh/uv/) (or pip/venv)
- Git

### 1. Clone and configure

```powershell
cd C:\Users\admin\Desktop\BuildWyse
copy .env.example .env
copy frontend\.env.example frontend\.env
```

Edit `.env` — for local demo without Supabase, set:

```env
DEBUG=true
FORCE_MEMORY_STORE=true
AI_MODE=stub
```

### 2. Backend

```powershell
cd backend
uv venv
uv pip install -r requirements.txt
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Health check: [http://localhost:8000/health](http://localhost:8000/health)  
OpenAPI docs: [http://localhost:8000/docs](http://localhost:8000/docs)

### 3. Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### 4. Docker (optional)

```powershell
docker compose up --build
```

---

## Quick start — Unix (macOS / Linux)

```bash
cd ~/BuildWyse
cp .env.example .env
cp frontend/.env.example frontend/.env

# Backend
cd backend
uv venv && uv pip install -r requirements.txt
uv run uvicorn app.main:app --reload --port 8000 &

# Frontend
cd ../frontend
npm install && npm run dev
```

---

## Environment variables

Root `.env` (backend reads from repo root or `backend/.env`):

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | For live DB | `https://qeumykfaranencaeewjv.supabase.co` |
| `SUPABASE_ANON_KEY` | For live DB | Anon/public key from Supabase dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | Recommended | Server-side writes (bypasses RLS) |
| `SUPABASE_JWT_SECRET` | For JWT auth | JWT secret from Supabase Auth settings |
| `OPENAI_API_KEY` | For live AI | OpenAI API key |
| `AI_MODE` | No | `stub` (default) or `live` |
| `DEBUG` | Dev | `true` enables `X-Dev-User-Id` auth bypass |
| `FORCE_MEMORY_STORE` | Dev | `true` forces in-memory store (no Supabase) |
| `FRONTEND_URL` | No | CORS origin (default `http://localhost:5173`) |
| `BACKEND_URL` | No | API base URL |
| `PLATFORM_COMMISSION_RATE` | No | Default `0.10` (10%) |
| `GITHUB_CLIENT_ID/SECRET` | Optional | GitHub integration |
| `PAYMENT_*` | Optional | Sandbox payment provider |
| `EMAIL_*` | Optional | Email delivery |
| `IDENTITY_MODE` | Optional | `simulated` in dev |

Frontend `frontend/.env`:

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend URL (default `http://localhost:8000`) |
| `VITE_SUPABASE_URL` | Same as `SUPABASE_URL` |
| `VITE_SUPABASE_ANON_KEY` | Same as `SUPABASE_ANON_KEY` |
| `VITE_DEV_AUTH` | `true` shows demo login buttons |

---

## Demo authentication

When `DEBUG=true` (backend) and `VITE_DEV_AUTH=true` (frontend), the login page shows demo buttons that send the `X-Dev-User-Id` header instead of a JWT.

| Role | UUID |
|------|------|
| Client | `11111111-1111-4111-8111-111111111101` |
| Freelancer | `11111111-1111-4111-8111-111111111102` |
| Admin | `11111111-1111-4111-8111-111111111104` |

Production auth uses Supabase:

```
Authorization: Bearer <supabase_access_token>
```

See [tests/e2e/lifecycle_smoke.md](./tests/e2e/lifecycle_smoke.md) for a full demo walkthrough.

---

## Running tests

```powershell
# Backend unit tests (memory mode, no network)
cd backend
uv run pytest tests -q

# Frontend production build
cd frontend
npm run build
```

---

## Architecture overview

```
┌─────────────┐     JWT / X-Dev-User-Id     ┌──────────────┐
│   Frontend  │ ──────────────────────────► │   FastAPI    │
│  (Vite SPA) │         /api/v1             │   Backend    │
└─────────────┘                             └──────┬───────┘
                                                   │
                     ┌─────────────────────────────┼─────────────────────────────┐
                     │                             │                             │
                     ▼                             ▼                             ▼
              ┌─────────────┐              ┌─────────────┐              ┌─────────────┐
              │  Supabase   │              │  ai/ (9     │              │ integrations│
              │  PostgreSQL │              │  services)  │              │ GitHub, pay │
              │  + Auth     │              │  OpenAI     │              │ email, ID   │
              └─────────────┘              └─────────────┘              └─────────────┘
```

Detailed docs:

- [docs/architecture/ARCHITECTURE.md](./docs/architecture/ARCHITECTURE.md)
- [docs/database/DATABASE.md](./docs/database/DATABASE.md)
- [docs/api/API.md](./docs/api/API.md)
- [docs/architecture/AI_ARCHITECTURE.md](./docs/architecture/AI_ARCHITECTURE.md)
- [docs/architecture/SECURITY.md](./docs/architecture/SECURITY.md)
- [docs/architecture/DEPLOYMENT.md](./docs/architecture/DEPLOYMENT.md)
- [docs/qa/TESTING.md](./docs/qa/TESTING.md)

---

## Supabase setup (production wiring)

1. Open [Supabase project qeumykfaranencaeewjv](https://supabase.com/dashboard/project/qeumykfaranencaeewjv)
2. Copy **Project URL**, **anon key**, **service_role key**, and **JWT secret** into `.env`
3. Apply migrations from `database/migrations/` via SQL editor (see [database/README.md](./database/README.md))
4. Apply RLS policies from `database/policies/001_rls_policies.sql`
5. Seed Auth users with the Admin API + `database/seed/001_seed.sql`
6. Set `FORCE_MEMORY_STORE=false` and restart the backend

---

## License

Proprietary — BuildWyse.in
