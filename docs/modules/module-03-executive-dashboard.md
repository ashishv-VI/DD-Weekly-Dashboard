# Module 3: Executive Dashboard

**Phase:** 1 | **Priority:** High — first thing users see after login

---

## KPIs

| KPI | Source | Description |
|-----|--------|-------------|
| Organic Clicks | GSC | Total clicks from organic search |
| Organic Sessions | GA4 | Sessions from organic channel |
| Impressions | GSC | Total search impressions |
| CTR | GSC | Click-through rate (clicks / impressions) |
| Average Position | GSC | Mean ranking position |
| Conversions | GA4 | Total conversion events |
| Revenue | GA4 | E-commerce revenue (if tracked) |
| AI Sessions | GA4 (referrer) | Sessions from AI platforms |

---

## Date Filters

| Filter | Date Range |
|--------|-----------|
| Last 7 Days | Today - 7 days |
| Last 30 Days | Today - 30 days |
| Last 90 Days | Today - 90 days |
| Quarterly | Current quarter |
| Yearly | Current year |
| Custom Range | User-defined start + end date |

---

## Comparison

Each KPI should show:
- Current period value
- Previous period value (same length)
- % change (up/down with color indicator)
- Trend sparkline chart

---

## Layout (Proposed)

```
┌─────────────────────────────────────────────────────────┐
│  [Client: Acme Corp]  [Domain: acme.com]  [Last 30 Days ▼]  │
├──────────┬──────────┬──────────┬──────────┬──────────────┤
│ Clicks   │ Sessions │Impressions│  CTR    │  Avg Position│
│ 12,450   │ 14,200  │  180,000  │  6.9%   │     18.4     │
│ ▲ 12%   │ ▲ 8%   │  ▲ 5%    │  ▲ 0.4% │  ▼ 2.1 (good)│
├──────────┴──────────┴──────────┴──────────┴──────────────┤
│  Conversions: 423   Revenue: $28,400   AI Sessions: 1,240  │
├──────────────────────────────────────────────────────────┤
│  [Traffic Trend Chart — line chart, all channels]        │
├──────────────────────────────────────────────────────────┤
│  [Top 5 Keywords]        [Top 5 Landing Pages]           │
└──────────────────────────────────────────────────────────┘
```

---

## Charts Required

| Chart | Type | Data |
|-------|------|------|
| Traffic trend | Line chart | Daily clicks + sessions over period |
| Channel breakdown | Donut chart | Organic, Direct, Referral, Social, Paid, AI |
| Position distribution | Bar chart | Keywords by position bucket (1-3, 4-10, 11-20, 20+) |
| Conversion trend | Line chart | Daily conversions over period |

---

## Open Questions / Gaps

- [ ] **Revenue** — Only available if GA4 e-commerce tracking is set up. Need null state.
- [ ] **AI Sessions** — Limited accuracy (60-80%). Should show data source disclaimer.
- [ ] Is "Average Position" weighted by impressions or a simple mean?
- [ ] Should KPIs be customizable per user/client?
- [ ] What is the "zero state" for a new client with no historical data?
- [ ] Are annotations supported (e.g., mark algorithm updates on the chart)?
