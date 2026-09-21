# BuildWyse Deployment

## Target architecture

| Component | Platform | URL pattern |
|-----------|----------|-------------|
| Frontend | **Vercel** | `https://buildwyse.vercel.app` (example) |
| Backend | **Railway** | `https://buildwyse-api.up.railway.app` (example) |
| Database + Auth | **Supabase** | `https://qeumykfaranencaeewjv.supabase.co` |

---

## Supabase (database + auth)

**Project:** `qeumykfaranencaeewjv`

### Initial setup

1. Open [Supabase Dashboard](https://supabase.com/dashboard/project/qeumykfaranencaeewjv)
2. Apply migrations (see [database/README.md](../../database/README.md))
3. Apply RLS policies: `database/policies/001_rls_policies.sql`
4. Copy credentials to deployment secrets:
   - Project URL
   - Anon key → frontend
   - Service role key → backend only
   - JWT secret → backend

### Auth configuration

- Enable email/password provider
- Set site URL to production frontend domain
- Add redirect URLs for auth callbacks
- Seed users via Admin API + `database/seed/001_seed.sql`

---

## Backend — Railway

### Dockerfile

Uses `backend/Dockerfile` with repo root context (includes `ai/` and `integrations/`).

### Environment variables

```env
SUPABASE_URL=https://qeumykfaranencaeewjv.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<from-dashboard>
SUPABASE_JWT_SECRET=<from-dashboard>
SUPABASE_ANON_KEY=<from-dashboard>
OPENAI_API_KEY=<optional>
AI_MODE=live
DEBUG=false
FORCE_MEMORY_STORE=false
FRONTEND_URL=https://your-frontend.vercel.app
BACKEND_URL=https://your-api.up.railway.app
PLATFORM_COMMISSION_RATE=0.10
```

### Deploy steps

1. Connect Railway to GitHub repository
2. Set root directory / Dockerfile path to `backend/Dockerfile`
3. Configure build context as repo root
4. Add environment variables in Railway dashboard
5. Deploy — health check: `GET /health`

### Start command

```
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Railway sets `$PORT` automatically.

---

## Frontend — Vercel

### Build settings

| Setting | Value |
|---------|-------|
| Framework | Vite |
| Root directory | `frontend` |
| Build command | `npm run build` |
| Output directory | `dist` |

### Environment variables

```env
VITE_API_URL=https://your-api.up.railway.app
VITE_SUPABASE_URL=https://qeumykfaranencaeewjv.supabase.co
VITE_SUPABASE_ANON_KEY=<from-dashboard>
VITE_DEV_AUTH=false
```

### Deploy steps

1. Import repository in Vercel
2. Set root to `frontend/`
3. Add environment variables
4. Deploy — verify login and API connectivity

---

## Docker Compose (local / staging)

```bash
docker compose up --build
```

Services:

- `backend` — port 8000, mounts `backend/`, `ai/`, `integrations/`
- `frontend` — port 5173, dev server with hot reload

Uses `.env` from repo root.

---

## CI/CD recommendations

| Stage | Action |
|-------|--------|
| PR | `pytest` backend, `npm run build` frontend |
| Merge to main | Auto-deploy backend (Railway) + frontend (Vercel) |
| DB changes | Manual migration via Supabase SQL editor or CLI |

---

## Post-deploy verification

1. `GET {BACKEND_URL}/health` → `supabase_configured: true`, `memory_mode: false`
2. Sign in via Supabase Auth on frontend
3. Create test project, verify lifecycle transition
4. Confirm audit log entry in admin panel
5. Run [lifecycle smoke test](../../tests/e2e/lifecycle_smoke.md) against staging

---

## Rollback

| Layer | Procedure |
|-------|-----------|
| Frontend | Vercel instant rollback to previous deployment |
| Backend | Railway redeploy previous image / git revert |
| Database | Supabase point-in-time recovery (Pro plan) or manual migration revert |

---

## Related

- [../qa/TESTING.md](../qa/TESTING.md)
- [SECURITY.md](./SECURITY.md)
