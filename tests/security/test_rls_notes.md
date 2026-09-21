# RLS Coverage Notes

BuildWyse uses Supabase Row Level Security (RLS) on all 83 public application tables defined in `database/policies/001_rls_policies.sql`.

## Policy model

| Pattern | Description |
|---------|-------------|
| **Admin bypass** | `is_admin()` grants full access on most tables |
| **Owner access** | Users read/update their own `profiles`, preferences, and role rows |
| **Project participant** | Client, assigned freelancer, and org members on a project can read related rows |
| **Scoped writes** | Inserts/updates restricted to the acting party (client creates projects, freelancer submits evidence, etc.) |

Helper functions in `database/migrations/parts/15_helper_functions.sql`:

- `is_admin()` — checks `user_roles.role = 'admin'`
- `is_project_client(project_id)` — client ownership
- `is_project_participant(project_id)` — client or assigned freelancer
- `current_user_role()` — primary role for policy branching

## Tables with RLS enabled

All tables listed in the RLS bootstrap block inside `001_rls_policies.sql`, grouped by domain:

| Domain | Tables |
|--------|--------|
| Identity | `profiles`, `user_roles`, `identity_verifications`, `verification_records` |
| Freelancer | `freelancer_profiles`, `skills`, `freelancer_skills`, `freelancer_experience`, `freelancer_certifications`, `portfolios`, `portfolio_projects`, `interview_records` |
| Organizations | `organizations`, `organization_roles`, `organization_members`, `teams`, `team_members` |
| Projects | `projects`, `project_requirements`, `requirement_versions`, `project_documents`, `document_versions`, `project_budgets`, `development_preferences` |
| AI | `ai_conversations`, `ai_messages`, `ai_runs`, `ai_usage`, `requirement_dna`, `expertise_dna`, `embeddings` |
| Matching | `matching_runs`, `match_scores`, `project_candidates`, `candidate_responses`, `technical_proposals`, `selections`, `meetings` |
| Execution | `project_phases`, `milestones`, `project_tasks`, `deliverables`, `calendar_events`, `phase_submissions`, `evidence_items`, `repository_connections`, `deployment_records`, `verification_reports`, `approval_records`, `rejection_records` |
| Health | `project_health`, `health_metrics`, `satisfaction_records`, `health_risks` |
| CRMS | `change_requests`, `change_conversations`, `change_requirements`, `change_impact_analysis`, `change_documents`, `change_estimates`, `change_approvals` |
| ASSM | `service_requests`, `service_conversations`, `service_requirements`, `service_documents`, `service_budgets`, `service_assignments`, `service_phases` |
| Payments | `payment_orders`, `payments`, `milestone_payments`, `platform_commissions`, `payouts`, `refunds`, `invoices`, `webhook_events`, `reconciliation_records` |
| Certification | `certificates`, `certificate_verification` |
| Platform | `notifications`, `notification_preferences`, `audit_logs`, `project_history` |

## Backend vs RLS

The FastAPI backend prefers `SUPABASE_SERVICE_ROLE_KEY`, which **bypasses RLS** for server-side operations. Client-facing Supabase JS calls use the anon key and **must** respect RLS.

When only the anon key is configured, the backend logs a warning and writes may fail under RLS.

## How to retest RLS

### 1. Apply schema and policies

```bash
# Supabase SQL editor or psql
\i database/migrations/001_initial_schema_apply.sql
\i database/migrations/parts/15_helper_functions.sql
\i database/policies/001_rls_policies.sql
```

### 2. Seed test users

Use the Supabase Auth Admin API with the **service role key** (never commit the key):

```bash
curl -X POST "$SUPABASE_URL/auth/v1/admin/users" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"client@test.local","password":"<temp-password>","email_confirm":true}'
```

Insert matching rows in `profiles` and `user_roles` for each test persona.

### 3. Obtain JWTs per role

Sign in each user via Supabase Auth and capture the access token, or use the Supabase dashboard **Auth → Users → Generate JWT** for testing.

### 4. Run read/write probes

Using the **anon key** + user JWT (not service role):

```sql
-- As client: should see own projects only
SET request.jwt.claim.sub = '<client-uuid>';
SELECT * FROM projects WHERE client_id = auth.uid();
```

Or via REST:

```bash
curl "$SUPABASE_URL/rest/v1/projects?select=id,title" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer <client-jwt>"
```

### 5. Negative tests

| Test | Expected |
|------|----------|
| Client reads another client's project | Empty or 403 |
| Freelancer updates project budget | Denied |
| Unauthenticated read on `payments` | Denied |
| Admin reads all `audit_logs` | Allowed |

### 6. Backend integration check

Set `SUPABASE_SERVICE_ROLE_KEY=` (empty) and `SUPABASE_ANON_KEY=<anon>` in `.env`, restart API, and confirm project creation succeeds only when JWT matches the acting user.

## Known gaps

- RLS policies are defined in SQL but not yet exercised by automated pytest (backend tests use `FORCE_MEMORY_STORE=true`).
- Full cross-table policy matrix should be validated before production launch with real Auth users.
