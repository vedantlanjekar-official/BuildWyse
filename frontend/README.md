# BuildWyse Frontend

React + TypeScript SPA for the BuildWyse project execution platform. Connects to the FastAPI backend at `/api/v1`.

## Stack

- **Vite** + React 19 + TypeScript
- **Tailwind CSS v4** via `@tailwindcss/vite`
- **React Router** — role-based routing
- **TanStack Query** — server state
- **Zustand** — auth session store
- **React Hook Form + Zod** — forms
- **Supabase JS** — login/register (optional)
- **Recharts** — admin dashboard charts
- **Lucide React** — icons

## Quick start

```powershell
cd frontend
npm install
copy .env.example .env
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Backend (required)

Start the API in memory mode (no Supabase needed):

```powershell
cd backend
# Ensure DEBUG=true in .env for dev-auth header support
uv run uvicorn app.main:app --reload --port 8000
```

### Demo login

With `VITE_DEV_AUTH=true` and backend `DEBUG=true`, use the demo buttons on `/login`:

| Role       | UUID                                   |
|------------|----------------------------------------|
| Client     | `11111111-1111-4111-8111-111111111101` |
| Freelancer | `11111111-1111-4111-8111-111111111102` |
| Admin      | `11111111-1111-4111-8111-111111111104` |

These IDs match `backend/app/repositories/memory_store.py` seed data.

## Environment variables

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | FastAPI base URL (default `http://localhost:8000`) |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_DEV_AUTH` | Set `true` to show demo login buttons |

## Project structure

```
src/
├── components/     # UI primitives + shared components
├── pages/          # Route pages by role
├── layouts/        # AppShell, ProjectLayout
├── hooks/          # useAuth, etc.
├── services/       # API client, Supabase, domain services
├── stores/         # Zustand auth store
├── types/          # TypeScript types
├── schemas/        # Zod validation schemas
├── utils/          # cn, env, roles, demo users
└── router/         # Routes, nav config, guards
```

## Role routing

After login, users are redirected by role:

| Role | Dashboard |
|------|-----------|
| `CLIENT` | `/dashboard/client` |
| `FREELANCER` | `/dashboard/freelancer` |
| `ENTERPRISE_*` | `/dashboard/enterprise` |
| `ADMIN` | `/admin` |

## Auth

- **Production**: Supabase JWT sent as `Authorization: Bearer <token>`
- **Dev demo**: `X-Dev-User-Id` header when `VITE_DEV_AUTH=true` and no Bearer token

## Scripts

```powershell
npm run dev      # Start dev server
npm run build    # Typecheck + production build
npm run preview  # Preview production build
npm run lint     # Oxlint
```

## Build

```powershell
npm run build
```

Output is written to `dist/`.
