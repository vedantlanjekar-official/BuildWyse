# BuildWyse AI Services

Nine AI modules powering requirement engineering, matching, verification, and governance.

## Quick links

- Architecture: [docs/architecture/AI_ARCHITECTURE.md](../docs/architecture/AI_ARCHITECTURE.md)
- API endpoints: [docs/api/API.md](../docs/api/API.md) (AI section)
- Product workflows: [000_WORKFLOWS_AND_MODULE_CONNECTIONS.md](../000_WORKFLOWS_AND_MODULE_CONNECTIONS.md)

## Services

| Service | File | Prompt |
|---------|------|--------|
| Research AI | `services/research_ai.py` | `prompts/research.txt` |
| Requirement AI | `services/requirement_ai.py` | `prompts/requirement_discovery.txt` |
| Documentation AI | `services/documentation_ai.py` | `prompts/documentation.txt` |
| Budget AI | `services/budget_ai.py` | `prompts/budget.txt` |
| Matching AI | `services/matching_ai.py` | `prompts/matching.txt` |
| Verification AI | `services/verification_ai.py` | `prompts/verification.txt` |
| Health AI | `services/health_ai.py` | `prompts/health.txt` |
| Change Management AI | `services/change_management_ai.py` | `prompts/change_management.txt` |
| After-Sales AI | `services/after_sales_ai.py` | `prompts/after_sales.txt` |

## Configuration

```env
AI_MODE=stub          # or live
OPENAI_API_KEY=       # required for live mode
```

Stub mode returns deterministic structured JSON — no API key needed.

## Import path

The backend adds the repo root to `sys.path`, so services import as:

```python
from ai.services import requirement_ai, research_ai
```
