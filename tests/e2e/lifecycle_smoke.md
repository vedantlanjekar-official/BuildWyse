# Lifecycle Smoke Test (Demo / Memory Mode)

Manual end-to-end walkthrough using **demo auth** (`X-Dev-User-Id`) without Supabase JWT or OpenAI.

## Prerequisites

| Setting | Value |
|---------|-------|
| Backend `.env` | `DEBUG=true`, `FORCE_MEMORY_STORE=true` (or omit Supabase keys) |
| Frontend `.env` | `VITE_DEV_AUTH=true`, `VITE_API_URL=http://localhost:8000` |
| Backend running | `uvicorn app.main:app --reload --port 8000` |
| Frontend running | `npm run dev` (port 5173) |

Verify health:

```bash
curl http://localhost:8000/health
# Expect: "memory_mode": true
```

## Demo user IDs

| Role | UUID | Header |
|------|------|--------|
| Client | `11111111-1111-4111-8111-111111111101` | `X-Dev-User-Id: 11111111-1111-4111-8111-111111111101` |
| Freelancer | `11111111-1111-4111-8111-111111111102` | `X-Dev-User-Id: 11111111-1111-4111-8111-111111111102` |
| Admin | `11111111-1111-4111-8111-111111111104` | `X-Dev-User-Id: 11111111-1111-4111-8111-111111111104` |

These IDs are seeded in `backend/app/repositories/memory_store.py`.

## Flow A — UI demo login

1. Open `http://localhost:5173/login`
2. Click **Demo Client** — lands on `/dashboard/client`
3. Create a project → `/projects/new`
4. Walk project tabs: Requirements → Documents → Budget → Matching → Phases
5. Log out, log in as **Demo Freelancer**
6. Open Opportunities / assigned project views
7. Log in as **Demo Admin** → `/admin` overview

## Flow B — API lifecycle (curl)

All requests use the client dev header unless noted.

### 1. Create project

```bash
curl -X POST http://localhost:8000/api/v1/projects \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: 11111111-1111-4111-8111-111111111101" \
  -d '{"title":"Corporate Website","description":"Marketing site rebuild"}'
```

Save `project_id` from the response.

### 2. Advance lifecycle states

```bash
PROJECT_ID=<uuid>
CLIENT=11111111-1111-4111-8111-111111111101

for STATE in REQUIREMENT_DISCUSSION DOCUMENTATION_PREPARATION DOCUMENTATION_REVIEW \
  BUDGET_PLANNING DEVELOPMENT_PREFERENCE FREELANCER_MATCHING FREELANCER_SELECTION \
  TECHNICAL_REVIEW CLIENT_FREELANCER_DISCUSSION AGREEMENT EXECUTION; do
  curl -X POST "http://localhost:8000/api/v1/projects/$PROJECT_ID/transition" \
    -H "Content-Type: application/json" \
    -H "X-Dev-User-Id: $CLIENT" \
    -d "{\"target_state\":\"$STATE\",\"reason\":\"smoke test\"}"
  echo " -> $STATE"
done
```

### 3. Requirements + AI chat (stub mode)

```bash
curl -X POST "http://localhost:8000/api/v1/ai/requirements/chat" \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: $CLIENT" \
  -d "{\"project_id\":\"$PROJECT_ID\",\"message\":\"We need a responsive corporate website with CMS.\"}"
```

### 4. Run matching

```bash
curl -X POST http://localhost:8000/api/v1/matching/run \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: $CLIENT" \
  -d "{\"project_id\":\"$PROJECT_ID\"}"
```

Expect up to 10 candidates from seeded freelancer pool.

### 5. Select freelancer

```bash
curl -X POST "http://localhost:8000/api/v1/matching/projects/$PROJECT_ID/select" \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: $CLIENT" \
  -d '{"freelancer_id":"<candidate-freelancer-profile-id>","notes":"Selected for smoke test"}'
```

### 6. Execution artifacts (freelancer header)

Create a phase, submit work, trigger verification stub:

```bash
FREELANCER=11111111-1111-4111-8111-111111111102

curl -X POST "http://localhost:8000/api/v1/phases/project/$PROJECT_ID" \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: $CLIENT" \
  -d '{"name":"Phase 1 — MVP","sequence":1}'
```

Use returned `phase_id` for milestones, submissions, and verification endpoints.

### 7. Payment sandbox

```bash
curl -X POST http://localhost:8000/api/v1/payments/orders \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: $CLIENT" \
  -d "{\"project_id\":\"$PROJECT_ID\",\"amount\":5000,\"currency\":\"USD\",\"milestone_id\":null}"
```

### 8. Certificate

After transitioning to `COMPLETED` → `CERTIFIED`:

```bash
curl -X POST "http://localhost:8000/api/v1/certificates/project/$PROJECT_ID" \
  -H "X-Dev-User-Id: $CLIENT" \
  -d '{}'
```

## Expected results

| Step | Pass criteria |
|------|---------------|
| Health | `memory_mode: true`, `status: ok` |
| Auth | `/api/v1/auth/me` returns demo profile without Bearer token |
| Transitions | Each state change returns 200; invalid skips return 400 |
| AI | Stub JSON summary returned when `AI_MODE=stub` |
| Matching | Non-empty candidate list with scores |
| Payments | Order + commission + payout records in memory store |
| Admin | Admin overview returns aggregate counts |

## Production wiring checklist

To move from memory mode to live Supabase:

1. Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`
2. Set `FORCE_MEMORY_STORE=false`
3. Seed Auth users via Admin API + run `database/seed/001_seed.sql`
4. Set `OPENAI_API_KEY` and `AI_MODE=live` for real AI responses
5. Replace `X-Dev-User-Id` with Supabase JWT (`Authorization: Bearer …`)
