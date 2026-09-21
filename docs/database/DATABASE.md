# BuildWyse Database

PostgreSQL hosted on Supabase project **qeumykfaranencaeewjv** (`https://qeumykfaranencaeewjv.supabase.co`).

## Overview

| Property | Value |
|----------|-------|
| Tables | 84 public application tables |
| Extensions | `uuid-ossp`, `pgcrypto`, **pgvector** |
| Security | Row Level Security on all tables |
| Migrations | `database/migrations/` |
| Policies | `database/policies/001_rls_policies.sql` |
| Seed | `database/seed/001_seed.sql` |

---

## Migration path

Apply in order via Supabase SQL editor or `psql`:

```
1. database/migrations/parts/01_extensions.sql      # uuid-ossp, pgcrypto, vector
2. database/migrations/parts/02_identity.sql      # profiles, roles, verification
3. database/migrations/parts/03_freelancer.sql
4. database/migrations/parts/04_organizations.sql
5. database/migrations/parts/05_projects.sql
6. database/migrations/parts/06_ai.sql              # pgvector embeddings
7. database/migrations/parts/07_matching.sql
8. database/migrations/parts/08_execution.sql
9. database/migrations/parts/09_health.sql
10. database/migrations/parts/10_crms.sql
11. database/migrations/parts/11_assm.sql
12. database/migrations/parts/12_payments.sql
13. database/migrations/parts/13_certification.sql
14. database/migrations/parts/14_platform.sql
15. database/migrations/parts/15_helper_functions.sql  # RLS helper functions
16. database/policies/001_rls_policies.sql             # Enable RLS + policies
17. database/seed/001_seed.sql                         # Optional demo data
```

**Monolithic alternative:** `database/migrations/001_initial_schema_apply.sql` (all tables in one file).

**Chunked alternative:** `database/migrations/chunks/chunk_01.sql` through `chunk_03.sql`.

---

## Table inventory (84 tables)

### Identity (4)

| Table | Purpose |
|-------|---------|
| `profiles` | User profile linked to Supabase Auth UUID |
| `user_roles` | Role grants (client, freelancer, admin, org roles) |
| `identity_verifications` | KYC / identity check records |
| `verification_records` | Verification audit trail |

### Freelancer (8)

| Table | Purpose |
|-------|---------|
| `freelancer_profiles` | Professional profile, headline, availability |
| `skills` | Skill taxonomy |
| `freelancer_skills` | Skill assignments with proficiency |
| `freelancer_experience` | Work history |
| `freelancer_certifications` | Credentials |
| `portfolios` | Portfolio containers |
| `portfolio_projects` | Portfolio case studies |
| `interview_records` | Technical interview results |

### Organizations (5)

| Table | Purpose |
|-------|---------|
| `organizations` | Enterprise company records |
| `organization_roles` | Role definitions within org |
| `organization_members` | User ↔ org membership |
| `teams` | Freelancer teams |
| `team_members` | Team roster |

### Projects (7)

| Table | Purpose |
|-------|---------|
| `projects` | Core project entity + lifecycle state |
| `project_requirements` | Structured requirements |
| `requirement_versions` | Requirement version history |
| `project_documents` | Generated docs (PRD, architecture) |
| `document_versions` | Document revisions |
| `project_budgets` | Budget estimates by model |
| `development_preferences` | Individual / team / enterprise choice |

### AI (7)

| Table | Purpose |
|-------|---------|
| `ai_conversations` | AI chat sessions |
| `ai_messages` | Message history |
| `ai_runs` | AI execution metadata |
| `ai_usage` | Token/cost tracking |
| `requirement_dna` | Project requirement embeddings profile |
| `expertise_dna` | Freelancer expertise embeddings profile |
| `embeddings` | **pgvector** storage for similarity search |

### Matching (7)

| Table | Purpose |
|-------|---------|
| `matching_runs` | Matching execution records |
| `match_scores` | Per-candidate scores |
| `project_candidates` | Top-N candidate list |
| `candidate_responses` | Freelancer responses to invitations |
| `technical_proposals` | Pre-engagement proposals |
| `selections` | Client selection decisions |
| `meetings` | Scheduled discussions |

### Execution (12)

| Table | Purpose |
|-------|---------|
| `project_phases` | Development phases |
| `milestones` | Phase milestones |
| `project_tasks` | Task breakdown |
| `deliverables` | Expected deliverable definitions |
| `calendar_events` | Schedule events |
| `phase_submissions` | Work submissions per phase |
| `evidence_items` | Supporting evidence |
| `repository_connections` | GitHub repo links |
| `deployment_records` | Deployment URLs / status |
| `verification_reports` | AI verification output |
| `approval_records` | Client approvals |
| `rejection_records` | Client rejections with reasons |

### Health (4)

| Table | Purpose |
|-------|---------|
| `project_health` | Overall health snapshot |
| `health_metrics` | Individual metric readings |
| `satisfaction_records` | Client/freelancer satisfaction |
| `health_risks` | Identified risk items |

### CRMS (7)

| Table | Purpose |
|-------|---------|
| `change_requests` | Change request header |
| `change_conversations` | Discussion threads |
| `change_requirements` | New/changed requirements |
| `change_impact_analysis` | AI impact assessment |
| `change_documents` | Updated documentation |
| `change_estimates` | Cost/timeline estimates |
| `change_approvals` | Approval workflow |

### ASSM (7)

| Table | Purpose |
|-------|---------|
| `service_requests` | After-sales request header |
| `service_conversations` | Service discussions |
| `service_requirements` | Service scope requirements |
| `service_documents` | Service-related docs |
| `service_budgets` | Service cost estimates |
| `service_assignments` | Resource assignment |
| `service_phases` | Service execution phases |

### Payments (9)

| Table | Purpose |
|-------|---------|
| `payment_orders` | Payment intent / order |
| `payments` | Completed payment records |
| `milestone_payments` | Milestone ↔ payment linkage |
| `platform_commissions` | Platform fee deductions |
| `payouts` | Freelancer payout records |
| `refunds` | Refund processing |
| `invoices` | Invoice generation |
| `webhook_events` | Provider webhook log |
| `reconciliation_records` | Financial reconciliation |

### Certification (2)

| Table | Purpose |
|-------|---------|
| `certificates` | Issued certificates |
| `certificate_verification` | Public verification lookups |

### Platform (4)

| Table | Purpose |
|-------|---------|
| `notifications` | User notifications |
| `notification_preferences` | Per-user notification settings |
| `audit_logs` | Platform audit trail |
| `project_history` | Project event timeline |

---

## pgvector

Extension enabled in `01_extensions.sql`:

```sql
CREATE EXTENSION IF NOT EXISTS "vector";
```

The `embeddings` table stores vector representations for:

- Requirement DNA (project-side)
- Expertise DNA (freelancer-side)
- Matching similarity (cosine / Jaccard hybrid in application layer)

Embedding dimensions and index strategy are defined in `06_ai.sql`. For production, consider adding an `ivfflat` or `hnsw` index after seeding representative data volume.

---

## Row Level Security (RLS)

All 84 tables have RLS enabled via `database/policies/001_rls_policies.sql`.

Key helper functions (`15_helper_functions.sql`):

- `is_admin()` — admin role check
- `is_project_client(project_id)` — client ownership
- `is_project_participant(project_id)` — client or assigned freelancer
- `current_user_role()` — primary role resolution

Policy patterns:

- Admins: full CRUD on governance tables
- Clients: own projects, requirements, payments, approvals
- Freelancers: assigned project data, submissions, evidence
- Org members: organization-scoped reads

See [tests/security/test_rls_notes.md](../../tests/security/test_rls_notes.md) for retest procedures.

---

## Backend access pattern

| Key | RLS | Usage |
|-----|-----|-------|
| `SUPABASE_SERVICE_ROLE_KEY` | Bypassed | FastAPI server writes (recommended) |
| `SUPABASE_ANON_KEY` + user JWT | Enforced | Frontend direct Supabase calls |
| Memory store | N/A | Local dev / tests (`FORCE_MEMORY_STORE=true`) |

---

## Related

- [database/README.md](../../database/README.md)
- [../architecture/SECURITY.md](../architecture/SECURITY.md)
