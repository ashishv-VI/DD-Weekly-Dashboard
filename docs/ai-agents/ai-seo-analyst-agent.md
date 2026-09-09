# AI SEO Analyst Agent

**Phase:** 4 | **Runs:** Nightly at 3:30 AM | **Output:** Insights + Recommendations

---

## Responsibilities

| Task | Description |
|------|-------------|
| Ranking Analysis | Identify significant position changes vs previous period |
| Traffic Analysis | Explain traffic changes, surface causes |
| Opportunity Detection | Find keywords ready for ranking improvement |
| Recommendation Generation | Produce prioritized, actionable SEO recommendations |

---

## Input Context (Fed to LLM)

```
Property: {domain}
Date range: last 30 days

Traffic summary:
  - Organic clicks: {value} ({change}% vs previous period)
  - Avg position: {value} ({change} vs previous period)
  - Top 10 rising keywords: [list]
  - Top 10 dropping keywords: [list]
  - Pages losing traffic: [list]
  - Opportunity keywords (position 4-10): [list]
  - New keywords this month: [count]
  - Lost keywords this month: [count]
```

---

## Output Format (Structured JSON)

```json
{
  "summary": "Organic traffic is up 12% driven by position improvements on 3 core service pages.",
  "insights": [
    {
      "type": "opportunity",
      "priority": "high",
      "title": "5 keywords in position 4-6 ready to move to top 3",
      "detail": "These keywords have high impressions and a small position improvement could significantly increase clicks.",
      "keywords": ["keyword1", "keyword2"],
      "recommended_action": "Improve content depth and add internal links to these pages."
    }
  ],
  "warnings": [
    {
      "type": "ranking_drop",
      "priority": "high",
      "title": "Main product page dropped from position 3 to position 9",
      "detail": "This coincides with a competitor updating their page.",
      "recommended_action": "Review competitor page and update content to be more comprehensive."
    }
  ],
  "recommendations": [
    {
      "priority": 1,
      "action": "Optimize title tag on /services/digital-marketing page",
      "expected_impact": "Improve CTR from 2.1% to estimated 4-5%"
    }
  ]
}
```

---

## Hallucination Guard

The agent's recommendations are validated before storing:
- All keyword references must exist in the `keywords` table
- All page references must exist in the `landing_pages` table
- Position values must match database values ± 2
- Traffic values must be within 5% of database totals

---

## Open Questions / Gaps

- [ ] LLM model not chosen — affects quality and cost
- [ ] How are recommendations prioritized? By impact? By effort?
- [ ] Are recommendations stored and tracked over time?
- [ ] Can users mark recommendations as "done" or "won't fix"?
- [ ] Is there a confidence score on each insight?
- [ ] How does the agent know about Google algorithm updates to contextualize traffic changes?
