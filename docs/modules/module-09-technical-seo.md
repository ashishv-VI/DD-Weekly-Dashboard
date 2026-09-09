# Module 9: Technical SEO Dashboard

**Phase:** 2 | **Priority:** High

---

## Core Web Vitals

| Metric | Full Name | Good | Needs Improvement | Poor |
|--------|-----------|------|------------------|------|
| LCP | Largest Contentful Paint | ≤ 2.5s | 2.5–4s | > 4s |
| CLS | Cumulative Layout Shift | ≤ 0.1 | 0.1–0.25 | > 0.25 |
| INP | Interaction to Next Paint | ≤ 200ms | 200–500ms | > 500ms |

**Data Source:** Chrome UX Report (CrUX) API — real-world user data, not lab data.

---

## SEO Monitoring

| Check | Description | Data Source |
|-------|-------------|-------------|
| Index Coverage | % of submitted URLs indexed | GSC Coverage API |
| Sitemap Issues | Errors in XML sitemap | Custom crawler |
| Robots Issues | Robots.txt blocks, crawl access | Custom crawler |
| Canonical Issues | Missing, conflicting, or incorrect canonical tags | Custom crawler |
| Redirect Issues | Redirect chains, loops, 302 used instead of 301 | Custom crawler |
| Broken Links | Internal links returning 4xx/5xx | Custom crawler |
| Crawl Errors | Pages with crawl errors in GSC | GSC URL Inspection API |

---

## Dashboard Layout (Proposed)

```
┌──────────────────────────────────────────────────┐
│  Core Web Vitals                                 │
│  LCP: 2.1s ✓  CLS: 0.05 ✓  INP: 180ms ✓       │
├──────────────────────────────────────────────────┤
│  SEO Health Score: 84/100                        │
├─────────────┬─────────────┬──────────────────────┤
│ Index: 98%  │ Sitemap: ✓  │ Robots: ✓            │
├─────────────┼─────────────┼──────────────────────┤
│ Canonical   │ Redirects   │ Broken Links         │
│ 3 issues    │ 12 chains   │ 7 broken             │
├─────────────┴─────────────┴──────────────────────┤
│  Issues List (sortable table)                    │
│  URL | Issue Type | Severity | First Detected    │
└──────────────────────────────────────────────────┘
```

---

## Crawler Requirements

This module requires a web crawler that does not exist in the current architecture:

| Feature | Tool |
|---------|------|
| HTTP request engine | Playwright (handles JS-rendered pages) |
| HTML parsing | Cheerio |
| Link extraction | Recursive crawl with depth limit |
| Robots.txt parsing | `robots-parser` npm package |
| Sitemap parsing | XML parser |
| Canonical tag extraction | CSS selector on `link[rel=canonical]` |
| Redirect following | Axios with redirect tracking |
| Rate limiting | Max 1 request/second, respect `Crawl-delay` |

**Infrastructure:** Dedicated Cloud Run instance for crawler (not on main API server).

---

## CrUX API Integration

```
GET https://chromeuxreport.googleapis.com/v1/records:queryRecord
{
  "url": "https://example.com",
  "formFactor": "PHONE",
  "metrics": ["largest_contentful_paint", "cumulative_layout_shift", "interaction_to_next_paint"]
}
```

**Quota:** 150 requests/day free. For large client portfolios, request quota increase.
**Granularity:** Monthly data only (not daily).

---

## GSC Coverage Data

```
GET https://searchconsole.googleapis.com/webmasters/v3/sites/{siteUrl}/urlInspection/index:inspect
```

**Note:** GSC's index coverage data is available via the Coverage API. Quota impact: each URL inspection uses quota.

---

## Issues Severity Classification

| Severity | Examples |
|----------|---------|
| Critical | Pages blocked by robots.txt, canonical pointing to 404 |
| High | Redirect loops, broken internal links on high-traffic pages |
| Medium | Long redirect chains, CLS failures |
| Low | Minor canonical mismatches, orphaned pages |

---

## Open Questions / Gaps

- [ ] **Crawler infrastructure not in blueprint** — Must be designed and added
- [ ] How frequently does the crawler run? Daily or weekly?
- [ ] Is JavaScript rendering required (for SPAs)? Playwright vs Puppeteer?
- [ ] What is the crawl depth limit? (3 levels, 5 levels, full site?)
- [ ] How is crawl rate controlled to avoid overloading client sites?
- [ ] CrUX data is monthly — how is it presented in daily trend charts?
- [ ] Is PageSpeed Insights API used for lab data (per-URL testing)?
- [ ] Who gets notified when critical SEO issues are found?
- [ ] Is there a way to mark issues as "resolved" or "acknowledged"?
