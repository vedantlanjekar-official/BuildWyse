# BuildWyse AI Architecture

BuildWyse embeds AI at preparation, matching, verification, and governance stages. All AI logic lives in the top-level `ai/` package, imported by the FastAPI backend via repo-root `sys.path`.

## Mode switch

| Setting | Behavior |
|---------|----------|
| `AI_MODE=stub` | Deterministic structured responses (default, no API key needed) |
| `AI_MODE=live` + `OPENAI_API_KEY` | OpenAI `gpt-4o-mini` with JSON response format |
| Live failure | Falls back to stub automatically |

Controlled in `ai/services/_base.py`:

```python
def ai_mode_live() -> bool:
    return os.getenv("AI_MODE", "stub") == "live" and bool(os.getenv("OPENAI_API_KEY"))
```

---

## Nine AI services

| # | Service | Module | Prompt | API endpoint |
|---|---------|--------|--------|--------------|
| 1 | **Research AI** | `ai/services/research_ai.py` | `prompts/research.txt` | `POST /api/v1/ai/research` |
| 2 | **Requirement AI** | `ai/services/requirement_ai.py` | `prompts/requirement_discovery.txt` | `POST /api/v1/ai/requirements/chat` |
| 3 | **Documentation AI** | `ai/services/documentation_ai.py` | `prompts/documentation.txt` | `POST /api/v1/ai/documentation` |
| 4 | **Budget AI** | `ai/services/budget_ai.py` | `prompts/budget.txt` | `POST /api/v1/ai/budget` |
| 5 | **Matching AI** | `ai/services/matching_ai.py` | `prompts/matching.txt` | Used by `matching_service` |
| 6 | **Verification AI** | `ai/services/verification_ai.py` | `prompts/verification.txt` | `POST /api/v1/verification/submission/{id}` |
| 7 | **Health AI** | `ai/services/health_ai.py` | `prompts/health.txt` | Used by `health_service` |
| 8 | **Change Management AI** | `ai/services/change_management_ai.py` | `prompts/change_management.txt` | Used by `crms_service` |
| 9 | **After-Sales AI** | `ai/services/after_sales_ai.py` | `prompts/after_sales.txt` | `POST /api/v1/services/classify` |

---

## Shared infrastructure

```
ai/
├── services/
│   ├── _base.py           # load_prompt, call_openai, generate_structured
│   ├── research_ai.py
│   ├── requirement_ai.py
│   ├── documentation_ai.py
│   ├── budget_ai.py
│   ├── matching_ai.py
│   ├── verification_ai.py
│   ├── health_ai.py
│   ├── change_management_ai.py
│   └── after_sales_ai.py
├── prompts/               # System prompt templates (plain text)
└── schemas/
    └── outputs.py         # Pydantic output schemas per service
```

### `generate_structured()` pattern

Every service follows the same contract:

1. Load prompt from `ai/prompts/<name>.txt`
2. If live mode → call OpenAI with JSON response format
3. Validate response against Pydantic schema
4. On any failure → invoke local `stub_fn` for deterministic output

This ensures the platform remains fully functional without OpenAI credentials.

---

## Data persistence

AI interactions are stored in Supabase (or memory store):

| Table | Content |
|-------|---------|
| `ai_conversations` | Session metadata, type, project link |
| `ai_messages` | User/assistant message history |
| `ai_runs` | Execution metadata (model, latency) |
| `ai_usage` | Token/cost tracking |
| `requirement_dna` | Structured requirement profile for matching |
| `expertise_dna` | Freelancer expertise profile |
| `embeddings` | pgvector vectors for similarity |

---

## Matching intelligence

The matching pipeline combines:

1. **Deterministic scoring** — Jaccard skill overlap, experience, certification flags
2. **Embedding similarity** — optional text embedding when OpenAI is live
3. **Matching AI** — narrative compatibility assessment (stub or live)

Top 10 candidates are persisted in `project_candidates` with scores in `match_scores`.

---

## Verification flow

```
Freelancer submits work
  → evidence_items + repository_connections
  → verification_ai.generate(submission context)
  → verification_reports stored
  → client reviews + approval_records / rejection_records
```

AI assists; **client approval is required** for milestone completion.

---

## ASSM classification

`after_sales_ai` + rule-based thresholds in `assm_service` classify requests as:

- **After-sales service** — within scope/effort/module thresholds
- **New project** — material scope expansion

Thresholds are unit-tested in `backend/tests/test_assm_classifier.py`.

---

## Configuration

```env
OPENAI_API_KEY=sk-...        # Required for live mode
AI_MODE=live                   # or stub
```

Never commit API keys. Use environment variables or platform secret managers (Railway, Vercel).

---

## Related

- [ai/README.md](../../ai/README.md)
- [../api/API.md](../api/API.md)
- [../database/DATABASE.md](../database/DATABASE.md) (AI tables)
