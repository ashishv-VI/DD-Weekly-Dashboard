# Module 13: Conversion & ROI Dashboard

**Phase:** 5 | **Priority:** Low (Phase 5)

---

## Metrics

| Metric | Source | Description |
|--------|--------|-------------|
| Leads | GA4 + CRM | Total leads generated from SEO |
| Revenue | GA4 + CRM | Revenue attributed to SEO |
| Cost | Manual input | SEO spend (agency fees, tools) |
| SEO ROI | Calculated | (Revenue - Cost) / Cost × 100 |

---

## Attribution Model

```
Keyword → Landing Page → Lead → Sale
```

This requires connecting:
1. GSC keyword data (what query drove the click)
2. GA4 landing page data (which page received the visit)
3. GA4 conversion data (did the session convert?)
4. CRM data (did the lead become a sale?)

---

## CRM Integration (Phase 5)

| CRM | Integration Method |
|-----|-------------------|
| HubSpot | HubSpot API |
| Salesforce | Salesforce API |
| Pipedrive | Pipedrive API |
| Generic | Webhook / CSV import |

**Note:** CRM integration is complex. Requires mapping CRM deal stages to SEO-sourced sessions.

---

## ROI Calculation

```
SEO Investment = Agency fees + Tool costs + Content costs (manual input)

SEO Revenue = Sum of revenue from sessions where channel = "Organic Search"

SEO ROI = ((SEO Revenue - SEO Investment) / SEO Investment) × 100
```

---

## Dashboard Layout (Proposed)

```
┌─────────────────────────────────────────────┐
│  SEO ROI: 340%                              │
├──────────┬───────────┬────────────────────┤
│ Revenue  │ Leads     │ Cost               │
│ $48,000  │ 142       │ $14,000            │
├──────────┴───────────┴────────────────────┤
│  Attribution Flow:                         │
│  [Keyword] → [Landing Page] → [Lead] → [Sale]│
├──────────────────────────────────────────────┤
│  Top Revenue-Driving Keywords               │
│  Top Revenue-Driving Landing Pages          │
└──────────────────────────────────────────────┘
```

---

## Open Questions / Gaps

- [ ] **Attribution accuracy** — Last-click, first-click, or linear attribution? GA4 uses data-driven by default.
- [ ] **Multi-touch attribution** — A user may visit from organic, then return via direct before converting. How is this handled?
- [ ] **CRM integration complexity** — Matching a CRM deal to a specific SEO keyword is technically challenging without proper UTM tracking.
- [ ] **Revenue field** — Only present if GA4 e-commerce tracking is configured.
- [ ] How is "SEO cost" input? Manual entry per month?
- [ ] Is there a cost per lead / cost per acquisition metric?
- [ ] Is this module only for e-commerce or also for lead-gen businesses?
