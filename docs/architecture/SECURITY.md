# BuildWyse Security

## Threat model summary

BuildWyse handles financial transactions, identity verification, and project intellectual property. Primary security boundaries:

1. **Authentication** — Supabase JWT validation
2. **Authorization** — Role-based access in FastAPI + RLS in PostgreSQL
3. **Data isolation** — Project-scoped access for clients and freelancers
4. **Audit** — Immutable mutation log
5. **Secrets** — Environment variables only; never in source control

---

## Authentication

### Production flow

```
Client → Supabase Auth (sign in)
       → access_token (JWT, HS256)
       → Authorization: Bearer <token>
       → FastAPI decode_supabase_jwt()
       → Load profiles + user_roles
       → AuthUser with Role enum
```

JWT validated against `SUPABASE_JWT_SECRET` in `backend/app/core/security.py`.

### Development bypass

When `DEBUG=true` and no Bearer token is present, `X-Dev-User-Id` header loads a profile from the store. **Disable in production** (`DEBUG=false`).

---

## Authorization

### Role enum

```python
class Role(str, Enum):
    CLIENT = "CLIENT"
    FREELANCER = "FREELANCER"
    TEAM_MEMBER = "TEAM_MEMBER"
    TEAM_LEADER = "TEAM_LEADER"
    ENTERPRISE_EMPLOYEE = "ENTERPRISE_EMPLOYEE"
    ENTERPRISE_MANAGER = "ENTERPRISE_MANAGER"
    ADMIN = "ADMIN"
```

### DB role mapping

Database stores lowercase roles; mapped via `DB_ROLE_MAP` in `security.py`:

| DB value | App role |
|----------|----------|
| `client` | `CLIENT` |
| `freelancer` | `FREELANCER` |
| `admin` | `ADMIN` |
| `team_leader` | `TEAM_LEADER` |
| `org_manager` | `ENTERPRISE_MANAGER` |
| ... | ... |

### FastAPI guards

| Dependency | Effect |
|------------|--------|
| `get_current_user` | Requires valid JWT or dev header |
| `require_admin` | Requires `ADMIN` role |
| `require_roles(...)` | Requires one of specified roles (admin bypasses) |

Service-layer checks enforce project ownership (client) and assignment (freelancer).

---

## Row Level Security

All 84 public tables have RLS policies. See [tests/security/test_rls_notes.md](../../tests/security/test_rls_notes.md).

Backend uses `SUPABASE_SERVICE_ROLE_KEY` which **bypasses RLS**. This is intentional for server-side orchestration but means:

- All authorization must be enforced in FastAPI service layer
- Frontend direct Supabase calls use anon key + JWT (RLS enforced)

---

## Rate limiting

`RateLimitMiddleware`: 120 requests/minute per client IP.

Excluded paths: `/health`, `/docs`, `/openapi.json`, `/redoc`.

---

## Audit logging

`AuditContextMiddleware` + `audit_service` record:

- Actor ID
- Action name
- Entity type and ID
- Project context (when applicable)
- Timestamp

Stored in `audit_logs` table. Admin-only read via `/api/v1/admin/audit-logs`.

---

## Secrets management

| Secret | Storage | Never |
|--------|---------|-------|
| `SUPABASE_SERVICE_ROLE_KEY` | `.env`, Railway secrets | Commit, log, expose to frontend |
| `SUPABASE_JWT_SECRET` | Backend env only | Frontend bundle |
| `OPENAI_API_KEY` | Backend env only | Frontend bundle |
| `SUPABASE_ANON_KEY` | Frontend env (public by design) | N/A |

`.env` is gitignored. `.env.example` contains placeholders only.

---

## CORS

Allowed origins configured in `main.py`:

- `FRONTEND_URL` from env
- `http://localhost:5173`
- `http://127.0.0.1:5173`

Credentials allowed for cookie-based flows.

---

## Payment security

- Sandbox mode only (`PAYMENT_MODE=sandbox`)
- No real payment provider credentials required for development
- Idempotency keys prevent duplicate payout processing
- Commission rate configurable via `PLATFORM_COMMISSION_RATE`

---

## State machine integrity

Project lifecycle transitions are validated server-side in `ProjectStateMachine`. Clients cannot:

- Skip states
- Force terminal states without valid path
- Transition projects they do not own (service-layer check)

---

## Security checklist (production)

- [ ] `DEBUG=false`
- [ ] `FORCE_MEMORY_STORE=false`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set in backend secrets only
- [ ] `SUPABASE_JWT_SECRET` configured
- [ ] RLS policies applied and tested
- [ ] Auth users seeded via Admin API (not hardcoded passwords in repo)
- [ ] CORS restricted to production frontend URL
- [ ] Rate limits reviewed for expected traffic
- [ ] Audit logs monitored

---

## Related

- [../database/DATABASE.md](../database/DATABASE.md)
- [tests/security/test_rls_notes.md](../../tests/security/test_rls_notes.md)
