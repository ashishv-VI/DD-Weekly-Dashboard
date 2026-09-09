# Data Sources

## Per Module — Where Does the Data Come From?

| Module | Data Source | API / Method | Cost | Status |
|--------|------------|-------------|------|--------|
| M3 — Executive Dashboard | GA4 + GSC | Google APIs | Free | Confirmed |
| M4 — Search Console | GSC | Search Analytics API | Free | Confirmed |
| M5 — Analytics Dashboard | GA4 | Data API v1 | Free | Confirmed |
| M6 — AI Traffic | GA4 (referrer parsing) | Data API v1 | Free | Partial — depends on referrer availability |
| M7 — Landing Pages | GA4 + GSC | Both APIs | Free | Confirmed |
| M8 — Historical Performance | GA4 + GSC (stored) | PostgreSQL | Free | Confirmed |
| M9 — Technical SEO (CWV) | Chrome UX Report (CrUX) | CrUX API | Free | Confirmed |
| M9 — Technical SEO (crawl) | Custom crawler | Puppeteer / Playwright | Server cost only | **Not in architecture** |
| M10 — Schema Monitoring | Custom crawler | Puppeteer / Playwright | Server cost only | **Not in architecture** |
| M11 — GEO / AI Visibility | No public API exists | Manual sampling? | Unknown | **CRITICAL GAP** |
| M12 — Competitor Intelligence | Ahrefs / SEMrush / Moz | Third-party API | $500–$2000/month | **CRITICAL GAP — no source decided** |
| M13 — Conversion & ROI | GA4 + CRM | GA4 API + CRM API | GA4 free; CRM varies | Phase 5 |
| M14 — Reports | Internal data | PostgreSQL + PDF gen | Free | Confirmed |
| M15 — Alerts | Internal data | PostgreSQL | Free | Confirmed |

---

## Google APIs Detail

### GA4 — Google Analytics Data API v1

| Detail | Value |
|--------|-------|
| Endpoint | `analyticsdata.googleapis.com` |
| Auth | Google OAuth 2.0 |
| Quota | 200,000 tokens/day per project |
| Rate limit | 10 requests/second per property |
| Key endpoints | `runReport`, `runPivotReport`, `batchRunReports` |
| Data delay | 24-48 hours (not real-time for most reports) |
| Cost | Free |

### GSC — Search Console API v3

| Detail | Value |
|--------|-------|
| Endpoint | `searchconsole.googleapis.com` |
| Auth | Google OAuth 2.0 |
| Quota | **2,000 requests/day per project** (hard limit) |
| Max rows per request | 25,000 |
| Data delay | 2-3 days |
| Key endpoint | `searchanalytics.query` |
| Cost | Free |
| **Risk** | 2,000/day limit is tight for multi-client |

### Chrome UX Report (CrUX) API

| Detail | Value |
|--------|-------|
| Endpoint | `chromeuxreport.googleapis.com` |
| Auth | API key |
| Quota | 150 requests/day (free tier) |
| Data | Real-world Core Web Vitals (LCP, CLS, INP, FCP, TTFB) |
| Granularity | Monthly (not daily) |
| Cost | Free |

---

## Third-Party APIs (Unresolved)

### Competitor Intelligence — Options

| Provider | Monthly Cost | Keyword Data | API Access | Notes |
|----------|-------------|-------------|-----------|-------|
| Ahrefs API | $500–$2,000 | Yes | Yes | Best backlink + keyword data |
| SEMrush API | $400–$1,500 | Yes | Yes | Strong keyword gap tool |
| Moz API | $200–$500 | Partial | Yes | Limited vs Ahrefs/SEMrush |
| DataForSEO | $50–$500 | Yes | Yes | Pay-per-use, cheapest option |
| Custom SERP crawling | Server cost | Manual | N/A | Risky — Google ToS issues |

**Recommendation:** DataForSEO for cost efficiency, or SEMrush if budget allows.

### GEO / AI Visibility — Options

| Method | Feasibility | Accuracy | Cost |
|--------|------------|---------|------|
| Perplexity API | Partial | Low | Paid |
| ChatGPT query sampling | Manual/Unreliable | Very Low | Paid per token |
| BrightEdge / Conductor | Expensive enterprise tool | High | $3,000+/month |
| Custom prompt sampling | Experimental | Low | LLM token cost |
| Third-party GEO tools (emerging) | Limited | Medium | Varies |

**Status:** No reliable, scalable API exists for this. This module needs a methodology decision before Phase 3.

---

## AI Traffic Detection — Methodology

AI traffic is detected by parsing GA4 session source/referrer data:

| AI Platform | Referrer Domain |
|------------|----------------|
| ChatGPT | `chat.openai.com`, `chatgpt.com` |
| Gemini | `gemini.google.com` |
| Perplexity | `perplexity.ai` |
| Claude | `claude.ai` |
| Copilot | `copilot.microsoft.com`, `bing.com/chat` |

**Limitation:** Not all AI platforms pass referrer headers. Dark traffic (no referrer) may contain AI traffic that cannot be attributed. Accuracy is approximately 60-80%.

---

## Email Delivery (Alerts & Reports)

| Provider | Cost | Features |
|----------|------|---------|
| SendGrid | Free up to 100/day, then $15/mo | Transactional, reliable |
| Resend | Free up to 3,000/month | Modern, developer-friendly |
| Postmark | $15/month for 10,000 | High deliverability |
| AWS SES | ~$0.10 per 1,000 | Cheapest at scale |

**Not specified in blueprint. Must be decided before Phase 1 alerting.**

---

## Web Crawler Requirements (Phase 2)

For Technical SEO + Schema Monitoring, a crawler is needed:

| Feature | Tool |
|---------|------|
| HTML parsing | Cheerio or Playwright |
| JavaScript rendering | Playwright (headless Chromium) |
| Crawl rate limiting | Respect robots.txt, max 1 req/sec |
| Schema extraction | JSON-LD + Microdata parsing |
| Broken link detection | HTTP status code checking |
| Sitemap parsing | XML parsing |
| Robots.txt parsing | Standard parser |

**Infrastructure needed:** Dedicated crawler worker on Google Cloud (not on main NestJS app).
