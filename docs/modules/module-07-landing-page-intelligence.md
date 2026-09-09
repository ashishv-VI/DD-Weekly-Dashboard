# Module 7: Landing Page Intelligence

**Phase:** 1 | **Priority:** Medium-High

---

## Table Columns

| Column | Source | Description |
|--------|--------|-------------|
| URL | GA4 + GSC | Page path |
| Clicks | GSC | Organic search clicks |
| Sessions | GA4 | Total sessions |
| Conversions | GA4 | Conversion events |
| Revenue | GA4 | Revenue (e-commerce) |
| AI Sessions | ai_traffic | Sessions from AI platforms |
| Position | GSC | Average ranking position |

---

## Filters

| Filter | Values |
|--------|--------|
| Page Type | Blog, Service Pages, Product Pages |
| Date Range | 7d, 30d, 90d, custom |
| Sort By | Clicks, Sessions, Conversions, Revenue, Position |
| Search | URL search / filter |
| Trend | Growing, Declining, Stable |

---

## Page Type Classification

Page type classification is not available from GA4/GSC directly. Options:

| Method | How |
|--------|-----|
| URL pattern matching | `/blog/` → Blog, `/services/` → Service Pages |
| Manual tagging | User labels page types in settings |
| AI classification | AI categorizes pages from URL + title |

**Recommended: URL pattern matching as default, with manual override.**

---

## Calculated Metrics (Proposed)

| Metric | Formula |
|--------|---------|
| Conversion Rate | Conversions / Sessions × 100 |
| Revenue per Session | Revenue / Sessions |
| AI Traffic % | AI Sessions / Total Sessions × 100 |
| CTR | Clicks / Impressions (from GSC) |

---

## Charts Required

| Chart | Type | Data |
|-------|------|------|
| Top pages by clicks | Horizontal bar | Top 10 pages |
| Top pages by conversions | Horizontal bar | Top 10 pages |
| Traffic vs conversions scatter | Scatter plot | All pages (identify high traffic, low conversion pages) |
| Page trend for selected URL | Line chart | On row click — sessions over time |

---

## Data Join Logic

Landing page data requires joining GA4 + GSC data on URL:

```
SELECT
  gsc.page AS url,
  gsc.clicks,
  ga4.sessions,
  ga4.conversions,
  ga4.revenue,
  ai.ai_sessions,
  gsc.position
FROM landing_pages gsc
LEFT JOIN ga4_data ga4 ON gsc.url = ga4.page AND gsc.date = ga4.date
LEFT JOIN ai_traffic ai ON ai.landing_url = gsc.url AND ai.date = gsc.date
WHERE gsc.property_id = $1 AND gsc.date BETWEEN $2 AND $3
```

**Note:** URL normalization is critical — GA4 and GSC may represent the same URL differently (trailing slash, query parameters, etc.).

---

## Open Questions / Gaps

- [ ] How are query parameters handled? `/page/?utm_source=X` vs `/page/` — same page?
- [ ] How are paginated URLs handled? `/blog/page/2/` — group or separate?
- [ ] Is there a page-level detail view on click?
- [ ] **Revenue** — only shows if GA4 e-commerce is configured
- [ ] Can users add manual annotations to specific pages?
- [ ] How is page type classification customized per client?
