# BuildWyse Master Specification

Condensed product definition derived from [000_WORKFLOWS_AND_MODULE_CONNECTIONS.md](./000_WORKFLOWS_AND_MODULE_CONNECTIONS.md).

## Product definition

BuildWyse.in is an **AI-powered project execution ecosystem** — not merely a freelancer marketplace. It structures and governs the complete project lifecycle from idea through certification, while verified professionals perform the development work.

---

## 15 core pillars

| # | Pillar | Summary |
|---|--------|---------|
| 1 | **Verified Participants** | Clients and development professionals pass identity and capability verification before project engagement. |
| 2 | **AI Requirement Engineering** | Transforms initial ideas into structured, actionable requirements via guided AI conversation. |
| 3 | **AI Documentation** | Generates PRD, architecture, and technical documents from approved requirements. |
| 4 | **Budget + Development Model Intelligence** | Recommends budget ranges for Individual Freelancer, Freelancer Team, and Enterprise Company models. |
| 5 | **AI Talent Matching** | Requirement DNA vs Expertise DNA scoring; top-10 candidate selection with compatibility breakdown. |
| 6 | **Structured Execution** | Phases, milestones, calendars, deliverables, and task management with evidence collection. |
| 7 | **AI-Assisted Verification** | Repository, deployment, and evidence analysis to support milestone acceptance decisions. |
| 8 | **Human Approval** | Client retains control over milestone approval; AI assists, humans decide. |
| 9 | **Project Health Intelligence** | Consolidated schedule, quality, satisfaction, and risk signals. |
| 10 | **CRMS** | Formal Change Request Management — scope, cost, timeline, and documentation impact analysis. |
| 11 | **ASSM** | After-Sales Service Module — maintenance, improvements, and post-completion work with full project context. |
| 12 | **Payment Governance** | Milestone-linked payments, platform commission, freelancer payouts, change/after-sales billing. |
| 13 | **Permanent Project History** | Complete audit trail of requirements, decisions, submissions, approvals, changes, and payments. |
| 14 | **Certification** | Formal client and freelancer completion certificates with verification. |
| 15 | **Trust & Accountability** | Every material decision, submission, approval, change, and payment is documented and retrievable. |

---

## Lifecycle states

Server-enforced state machine (`backend/app/core/state_machine.py`):

```
PROJECT_DISCOVERY
  → REQUIREMENT_DISCUSSION
  → DOCUMENTATION_PREPARATION
  → DOCUMENTATION_REVIEW
  → BUDGET_PLANNING
  → DEVELOPMENT_PREFERENCE
  → FREELANCER_MATCHING
  → FREELANCER_SELECTION
  → TECHNICAL_REVIEW
  → CLIENT_FREELANCER_DISCUSSION
  → AGREEMENT
  → EXECUTION
  → PHASE_VERIFICATION
  → COMPLETED
  → CERTIFIED

Branch states (re-enter execution):
  CHANGE_REQUEST ↔ EXECUTION | COMPLETED
  AFTER_SALES ↔ EXECUTION | CHANGE_REQUEST | CERTIFIED
```

Transitions are validated server-side; clients cannot skip states.

---

## Platform modules

### Client-side

| Module | Responsibilities |
|--------|------------------|
| **Client Module** | Registration, verification, project discovery, AI requirements, documentation, budget, development preference |
| **Project Dashboard** | Lifecycle navigation, calendar, health, milestone approval |
| **Matching UI** | Candidate comparison, selection, technical review scheduling |
| **Payments** | Milestone orders, approval, history |
| **CRMS UI** | Change request creation, impact review, approval |
| **ASSM UI** | After-sales requests, classification (service vs new project) |
| **Certification** | Completion certificates |

### Freelancer-side

| Module | Responsibilities |
|--------|------------------|
| **Freelancer Module** | Profile, verification, portfolio, skills, certifications, interview records |
| **Opportunities** | Matching invitations, proposals, technical discussions |
| **Execution** | Tasks, milestones, repository/deployment submissions, evidence |
| **Verification** | View AI verification reports, respond to rejections |
| **Teams / Enterprise** | Team formation, org roles, internal allocation |

### Platform intelligence (AI)

| Service | Purpose |
|---------|---------|
| Research AI | Technology and domain research |
| Requirement AI | Structured requirement extraction |
| Documentation AI | PRD / architecture generation |
| Budget AI | Cost estimation by development model |
| Matching AI | DNA embedding and scoring assistance |
| Verification AI | Submission and repository analysis |
| Health AI | Project health synthesis |
| Change Management AI | CRMS impact analysis |
| After-Sales AI | Service scope classification |

### Platform governance

| Module | Responsibilities |
|--------|------------------|
| **AI Matching Module** | Run matching, score candidates, manage selections |
| **Project Execution Module** | Phases, milestones, submissions, approvals |
| **Revenue & Payment Management** | Orders, commissions, payouts, refunds, reconciliation |
| **Certification System** | Issue and verify completion certificates |
| **Admin** | Users, projects, payments, audit logs |
| **Notifications** | Lifecycle event alerts |
| **Audit** | Mutation logging on all API writes |

---

## Development models

Clients choose one execution model during **Development Preference**:

1. **Individual Freelancer** — single verified professional
2. **Freelancer Team** — coordinated team with leader
3. **Enterprise Company** — organization with manager/employee structure

Budget recommendations differ by model complexity and overhead.

---

## Scope baseline

Approved documentation at agreement time becomes the **scope baseline**:

- Requirements, architecture, phases, budget, timeline, deliverables

Deviations beyond threshold → **Change Request** (CRMS).  
Large after-sales modifications → may be classified as **new project** (ASSM classifier).

---

## Key differentiators

- End-to-end lifecycle governance (not just hiring)
- AI at every preparation and verification stage
- Milestone-linked payments with human approval
- Permanent project knowledge for CRMS and ASSM
- Requirement DNA ↔ Expertise DNA matching
- Full auditability for dispute resolution

---

## Related documentation

- Full workflow narrative: [000_WORKFLOWS_AND_MODULE_CONNECTIONS.md](./000_WORKFLOWS_AND_MODULE_CONNECTIONS.md)
- Technical architecture: [docs/architecture/ARCHITECTURE.md](./docs/architecture/ARCHITECTURE.md)
- API reference: [docs/api/API.md](./docs/api/API.md)
- Database schema: [docs/database/DATABASE.md](./docs/database/DATABASE.md)
