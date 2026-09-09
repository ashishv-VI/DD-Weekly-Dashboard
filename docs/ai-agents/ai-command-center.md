# AI Command Center

**Phase:** 4 | **Type:** Interactive (user-triggered) | **Interface:** Chat / Search bar

---

## What It Does

A natural language interface that allows users to ask questions about their SEO data and receive plain-English answers backed by real data.

---

## Example Queries

| Query | What It Returns |
|-------|----------------|
| "Why did traffic drop?" | Analysis of traffic decline with data context |
| "Which pages receive AI traffic?" | Table of pages sorted by AI sessions |
| "Which keywords are easiest to move into Top 3?" | Opportunity keywords (position 4-6, high impressions) |
| "Show pages losing traffic" | Pages with declining sessions vs previous period |
| "Show pages with declining CTR" | Pages where CTR dropped > 1% |
| "What's my SEO health score this month?" | Health score breakdown with explanation |
| "Which competitor is outranking us most?" | Competitor intelligence summary |
| "How much AI traffic did we get from ChatGPT?" | AI traffic breakdown by platform |

---

## Architecture

```
User types query
      ↓
Intent classification (LLM)
      ↓
Data fetcher (pulls relevant tables from DB based on intent)
      ↓
Context builder (formats data for LLM)
      ↓
LLM generates answer with data references
      ↓
Response renderer (plain text + optional chart/table)
```

---

## Intent Categories

| Intent | Data Sources | Example Queries |
|--------|-------------|----------------|
| Traffic analysis | ga4_data, gsc_data | "Why did traffic drop?" |
| Keyword intelligence | keywords table | "Best opportunity keywords" |
| Page performance | landing_pages | "Top performing pages" |
| AI traffic | ai_traffic | "AI traffic breakdown" |
| Technical SEO | technical_audits | "Current technical issues" |
| Alert status | alerts table | "Any active alerts?" |
| Competitor | competitor_keywords | "Competitor comparison" |

---

## Response Format

```
User: Which keywords are easiest to move into Top 3?

AI: Based on your data for the last 30 days, here are your 5 best keyword opportunities:

1. "logistics software" — currently position 4.2, 8,400 impressions/month
2. "freight management system" — currently position 5.1, 6,200 impressions/month
3. "supply chain platform" — currently position 6.7, 4,100 impressions/month

These keywords have high impressions but are just below the top 3. Improving your page's
content depth and acquiring 2-3 relevant backlinks could push them into positions 1-3,
potentially adding 1,200+ clicks per month.

[Show keyword table ▼]
```

---

## Guardrails

| Risk | Mitigation |
|------|-----------|
| Hallucinated data | All numbers cited must reference actual DB values |
| Out-of-scope queries | Graceful decline: "I can only answer SEO-related questions about your data" |
| Sensitive data | Never expose data from other clients |
| Overly confident wrong answers | Add confidence indicator or data timestamp |

---

## Open Questions / Gaps

- [ ] Is this a floating chat widget, a sidebar, or a dedicated page?
- [ ] Are query results shareable? Can users copy/export the AI response?
- [ ] Is conversation history preserved per session?
- [ ] What is the response time target? (LLM calls can take 2-5 seconds)
- [ ] Are there pre-built query suggestions for first-time users?
- [ ] Rate limiting — how many queries per user per day?
- [ ] Is the Command Center only for the executive/analyst role or all users?
