# BuildWyse Workflows

Complete product workflow narrative, module connections, and lifecycle documentation.

## Primary reference

**[000_WORKFLOWS_AND_MODULE_CONNECTIONS.md](../../000_WORKFLOWS_AND_MODULE_CONNECTIONS.md)**

This document covers:

- Platform definition and philosophy
- All 8 primary modules (Client, Freelancer, Matching, Execution, CRMS, ASSM, Payments, Certification)
- 15 core product pillars
- Project lifecycle states
- Client, freelancer, and enterprise ecosystems
- AI intelligence layer (9 services)
- Platform governance and auditability

## Condensed spec

For a shorter product summary, see [BUILDWYSE_MASTER_SPEC.md](../../BUILDWYSE_MASTER_SPEC.md).

## Technical mapping

| Workflow concept | Code location |
|------------------|---------------|
| Lifecycle states | `backend/app/core/state_machine.py` |
| API routes | `backend/app/api/v1/` |
| Database schema | `database/migrations/` |
| AI services | `ai/services/` |
| E2E smoke test | [tests/e2e/lifecycle_smoke.md](../../tests/e2e/lifecycle_smoke.md) |
