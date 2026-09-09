# Module 12: Competitor Intelligence

**Phase:** 3 | **Priority:** Medium | **Status:** CRITICAL GAP — no data source decided

---

## Metrics

| Metric | Description |
|--------|-------------|
| Keyword Gap | Keywords competitors rank for that the client does not |
| Content Gap | Content topics covered by competitors but missing from client |
| SERP Ownership | % of SERP results owned by client vs competitors |
| Visibility Share | Share of total search visibility vs competitors |
| Traffic Share | Estimated traffic share vs competitors |

---

## CRITICAL GAP: No Data Source Defined

All competitor intelligence metrics require a third-party data provider. Google APIs do not provide competitor data.

### Options

| Provider | Monthly Cost | Keyword Database | API | Best For |
|----------|-------------|-----------------|-----|---------|
| DataForSEO | $50–$500 | 22B+ keywords | Yes | Budget option, pay-per-use |
| SEMrush API | $400–$1,500 | 25B+ keywords | Yes | Comprehensive, well-known |
| Ahrefs API | $500–$2,000 | 22B+ keywords | Yes | Best backlink data |
| Moz API | $200–$500 | Smaller database | Yes | Brand recognition |

**Decision required before Phase 3 starts.**

---

## Keyword Gap Analysis

```
Client domain: example.com
Competitor domain: competitor.com

Keyword Gap = Keywords where:
  competitor.com ranks in position 1-20
  AND example.com does NOT rank in position 1-20
```

### Table Columns
| Column | Description |
|--------|-------------|
| Keyword | Search query |
| Competitor Position | Where competitor ranks |
| Client Position | Where client ranks (or "Not ranking") |
| Monthly Volume | Estimated search volume |
| Keyword Difficulty | 0–100 difficulty score |
| Opportunity Score | Calculated opportunity to rank |

---

## SERP Ownership

```
For a set of target keywords:
  Count how many SERPs show client in position 1-3
  Count how many SERPs show competitors in position 1-3
  Calculate share of voice
```

---

## Visibility Share Formula

```
Visibility Share = SUM(clicks_curve_factor[position] × impressions) per domain
                  ÷ SUM(total impressions for all tracked keywords)
```

---

## Competitor Setup

Users need to add competitor domains per project:

```
Project: example.com
Competitors:
  - competitor1.com
  - competitor2.com
  - competitor3.com (max 5 recommended)
```

---

## Database Tables

### `competitors`
| Column | Type |
|--------|------|
| id | UUID |
| project_id | UUID |
| domain | VARCHAR |
| added_at | TIMESTAMP |

### `competitor_keywords`
| Column | Type |
|--------|------|
| id | UUID |
| project_id | UUID |
| competitor_id | UUID |
| keyword | TEXT |
| position | INTEGER |
| volume | INTEGER |
| difficulty | INTEGER |
| date | DATE |

---

## Charts Required

| Chart | Type | Data |
|-------|------|------|
| Visibility share pie | Donut chart | Client vs each competitor |
| Keyword gap table | Table | Keyword, volumes, positions |
| Content gap topics | Tag cloud / list | Missing content topics |
| SERP ownership trend | Line chart | Share over time |

---

## Open Questions / Gaps

- [ ] **Which third-party API is used?** No decision made.
- [ ] **Budget:** Competitor API costs $50–$2,000/month. Who pays?
- [ ] How many competitors can be tracked per project?
- [ ] How often is competitor data refreshed? Daily? Weekly?
- [ ] Is content gap analysis keyword-based or topic-based?
- [ ] How is "Content Gap" detected without crawling competitor content?
- [ ] Are backlink gaps tracked (not in blueprint but common in SEO tools)?
