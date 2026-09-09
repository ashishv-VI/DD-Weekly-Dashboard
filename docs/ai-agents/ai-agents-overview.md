# AI Agent Ecosystem — Overview

**Phase:** 4 | **Priority:** Medium (after core platform is stable)

---

## Agent List

| Agent | Primary Role | Runs When |
|-------|-------------|-----------|
| AI QA Agent | Platform health validation | Nightly at 4:30 AM |
| AI SEO Analyst Agent | Ranking + traffic analysis | Nightly at 3:30 AM |
| AI Technical SEO Agent | Technical audit automation | Nightly at 3:30 AM |
| AI Data Analyst Agent | Data validation + anomaly detection | Nightly at 3:30 AM |
| AI UX Reviewer Agent | UX and mobile quality review | Weekly |
| AI Product Manager Agent | Feature and workflow quality assessment | Weekly |
| AI Command Center | Natural language query interface | On user request |

---

## Architecture

```
Nightly Pipeline Trigger (BullMQ)
        ↓
Insight Queue
        ├── AI SEO Analyst Agent
        ├── AI Technical SEO Agent
        └── AI Data Analyst Agent
              ↓
         Insights stored in `insights` table
              ↓
         Alert Agent checks for alert conditions
              ↓
QA Queue (4:30 AM)
        └── AI QA Agent → System Health Score
```

---

## LLM Decision (Not Specified in Blueprint)

| Option | Cost (per 1M tokens) | Best For |
|--------|---------------------|---------|
| Claude Sonnet 4.6 | $3 in / $15 out | Best reasoning, longest context |
| GPT-4o | $5 in / $15 out | Strong analysis |
| Gemini 1.5 Pro | $3.50 in / $10.50 out | Google ecosystem fit |
| Claude Haiku 4.5 | $0.80 in / $4 out | High-volume, lower complexity tasks |

**Recommended:** Claude Sonnet 4.6 for complex analysis agents, Claude Haiku 4.5 for QA and data validation agents.

---

## Cost Estimate (10 Clients, Nightly)

| Agent | Tokens/Night | Cost/Night | Cost/Month |
|-------|-------------|-----------|-----------|
| SEO Analyst | ~100K | $0.30 | $9 |
| Technical SEO | ~80K | $0.24 | $7.20 |
| Data Analyst | ~60K | $0.18 | $5.40 |
| QA Agent | ~40K | $0.12 | $3.60 |
| **Total (10 clients)** | | | **~$25/month** |

Scales linearly with client count: 50 clients ≈ $125/month.

---

## Shared Agent Infrastructure

| Component | Purpose |
|-----------|---------|
| Prompt templates | Stored in codebase, versioned |
| Context builder | Fetches relevant data from DB before agent call |
| Output parser | Extracts structured insights from agent response |
| Hallucination guard | Cross-checks agent claims against DB data |
| Cost tracker | Monitors token usage per agent per night |

---

## Open Questions / Gaps

- [ ] **LLM not chosen** — Must decide before Phase 4
- [ ] **Budget per night per client** — Need a cap to prevent runaway costs
- [ ] **Hallucination risk** — AI may generate incorrect recommendations. Add human review flag?
- [ ] **Prompt versioning** — How are prompts updated without breaking existing outputs?
- [ ] **Agent output format** — JSON structured output vs free text?
- [ ] Are AI insights shown immediately or after a human review step?
