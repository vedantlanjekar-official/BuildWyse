# BuildWyse API Reference

Base URL: `{BACKEND_URL}/api/v1` (default `http://localhost:8000/api/v1`)

Interactive docs: `{BACKEND_URL}/docs` (Swagger UI)

## Authentication

| Method | Header | When |
|--------|--------|------|
| Supabase JWT | `Authorization: Bearer <token>` | Production |
| Dev bypass | `X-Dev-User-Id: <profile-uuid>` | `DEBUG=true`, no Bearer token |

---

## Routes

### Health (root, not under `/api/v1`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Service health, memory mode, AI mode |

### Auth — `/api/v1/auth`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/auth/me` | Current user profile |
| `GET` | `/auth/session` | Session metadata |

### Users — `/api/v1/users`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/users/me` | Own profile |
| `PATCH` | `/users/me` | Update own profile |
| `GET` | `/users/{user_id}` | Get user by ID |

### Clients — `/api/v1/clients`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/clients/dashboard` | Client dashboard aggregates |
| `GET` | `/clients` | List clients (admin) |

### Freelancers — `/api/v1/freelancers`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/freelancers` | List freelancer profiles |
| `GET` | `/freelancers/{freelancer_id}` | Get freelancer by ID |
| `GET` | `/freelancers/me/profile` | Own freelancer profile |

### Organizations — `/api/v1/organizations`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/organizations` | List organizations |
| `POST` | `/organizations` | Create organization |

### Projects — `/api/v1/projects`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/projects` | List projects for current user |
| `POST` | `/projects` | Create project |
| `GET` | `/projects/{project_id}` | Get project |
| `PATCH` | `/projects/{project_id}` | Update project |
| `POST` | `/projects/{project_id}/transition` | Lifecycle state transition |

### Requirements — `/api/v1/requirements`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/requirements/project/{project_id}` | List requirements |
| `POST` | `/requirements/project/{project_id}` | Create requirement |
| `PATCH` | `/requirements/{requirement_id}` | Update requirement |

### AI — `/api/v1/ai`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/ai/conversations` | Create AI conversation |
| `POST` | `/ai/requirements/chat` | Requirement discovery chat |
| `POST` | `/ai/research` | Research AI query |
| `POST` | `/ai/documentation` | Generate documentation |
| `POST` | `/ai/budget` | Budget estimation |

### Documents — `/api/v1/documents`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/documents/generate` | Generate project document |
| `GET` | `/documents/project/{project_id}` | List project documents |

### Budgets — `/api/v1/budgets`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/budgets/estimate` | Create budget estimate |

### Matching — `/api/v1/matching`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/matching/run` | Run matching for project |
| `POST` | `/matching/projects/{project_id}/select` | Select freelancer candidate |

### Proposals — `/api/v1/proposals`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/proposals/project/{project_id}` | List proposals |
| `POST` | `/proposals` | Submit proposal |

### Phases — `/api/v1/phases`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/phases/project/{project_id}` | List phases |
| `POST` | `/phases/project/{project_id}` | Create phase |

### Milestones — `/api/v1/milestones`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/milestones/phase/{phase_id}` | List milestones |
| `POST` | `/milestones/phase/{phase_id}` | Create milestone |

### Tasks — `/api/v1/tasks`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/tasks/phase/{phase_id}` | List tasks |
| `POST` | `/tasks/phase/{phase_id}` | Create task |

### Submissions — `/api/v1/submissions`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/submissions/phase/{phase_id}` | Submit phase work |
| `POST` | `/submissions/approve` | Approve submission |

### Evidence — `/api/v1/evidence`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/evidence/submission/{submission_id}` | Attach evidence |

### Verification — `/api/v1/verification`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/verification/submission/{submission_id}` | Run AI verification |

### Project Health — `/api/v1/health`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health/project/{project_id}` | Project health snapshot |

### Calendar — `/api/v1/calendar`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/calendar/project/{project_id}` | List calendar events |
| `POST` | `/calendar` | Create calendar event |

### Change Requests — `/api/v1/change-requests`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/change-requests/project/{project_id}` | List change requests |
| `POST` | `/change-requests/project/{project_id}` | Create change request |

### After-Sales — `/api/v1/services`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/services/classify` | Classify service vs new project |
| `POST` | `/services/project/{project_id}` | Create service request |
| `GET` | `/services/project/{project_id}` | List service requests |

### Payments — `/api/v1/payments`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/payments/orders` | Create payment order |
| `POST` | `/payments/approve` | Approve milestone payment |

### Certificates — `/api/v1/certificates`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/certificates/project/{project_id}` | Issue certificate |
| `GET` | `/certificates/verify/{certificate_number}` | Public verification |

### Notifications — `/api/v1/notifications`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/notifications` | List notifications |
| `POST` | `/notifications/mark-read` | Mark notifications read |

### Admin — `/api/v1/admin`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/admin/overview` | Platform overview stats |
| `GET` | `/admin/projects` | All projects |
| `GET` | `/admin/users` | All users |
| `GET` | `/admin/audit-logs` | Audit log entries |
| `GET` | `/admin/payments` | Payment records |

---

## Common response codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Validation error / invalid state transition |
| `401` | Not authenticated |
| `403` | Insufficient role |
| `404` | Resource not found |
| `429` | Rate limit exceeded |

---

## Rate limiting

120 requests per minute per IP (excluding `/health`, `/docs`, `/openapi.json`, `/redoc`).

---

## Related

- [../architecture/ARCHITECTURE.md](../architecture/ARCHITECTURE.md)
- [../architecture/SECURITY.md](../architecture/SECURITY.md)
