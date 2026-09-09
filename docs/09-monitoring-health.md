# Monitoring Center & Health Scores

## Monitoring Center

### What is Tracked

| Health Area | Metrics Monitored |
|-------------|------------------|
| API Health | GA4 API, GSC API response time + error rate |
| Database Health | PostgreSQL query time, connection pool, disk |
| Queue Health | BullMQ job success rate, queue depth, lag |
| Sync Health | Last sync time per property, sync success rate |
| Security Health | Failed logins, suspicious sessions, token errors |

---

## Health Scores

| Score | Description | Range |
|-------|-------------|-------|
| SEO Health Score | Combines technical SEO, rankings, indexing | 0 – 100 |
| AI Visibility Score | Mentions + citations across AI platforms | 0 – 100 |
| GEO Score | GEO optimization maturity | 0 – 100 |
| Tracking Health Score | GA4 + GSC data completeness and freshness | 0 – 100 |
| System Health Score | Overall platform health (jobs, APIs, DB) | 0 – 100 |

---

## SEO Health Score — Proposed Calculation

| Component | Weight |
|-----------|--------|
| Index coverage (% pages indexed) | 25% |
| Core Web Vitals (LCP, CLS, INP pass rate) | 20% |
| No broken links | 15% |
| Sitemap valid + submitted | 10% |
| Robots.txt valid | 5% |
| Canonical issues (% pages without issues) | 10% |
| Schema coverage | 10% |
| Average ranking position trend | 5% |

---

## AI Visibility Score — Proposed Calculation

| Component | Weight |
|-----------|--------|
| AI mentions per week | 30% |
| AI citations per week | 30% |
| AI overview appearances | 20% |
| Trend (growing vs declining) | 20% |

**Note:** Calculation methodology not defined in original blueprint. Proposed above for review.

---

## GEO Score — Proposed Calculation

| Component | Weight |
|-----------|--------|
| Schema markup completeness | 25% |
| Content structured for AI answers (FAQ, How-to) | 25% |
| E-E-A-T signals (author, date, citations) | 20% |
| Site speed (LCP) | 15% |
| Mobile usability | 15% |

**Note:** GEO Score is an emerging concept. This scoring model is a proposal and should be validated against industry standards.

---

## System Health Score — Proposed Calculation

| Component | Weight |
|-----------|--------|
| GA4 sync success rate (last 7 days) | 20% |
| GSC sync success rate (last 7 days) | 20% |
| API uptime (last 7 days) | 20% |
| Database response time | 15% |
| Queue health (no stuck jobs) | 15% |
| Security (no failed login anomalies) | 10% |

---

## Alerting Thresholds (Monitoring Center)

| Metric | Warning | Critical |
|--------|---------|---------|
| Sync job failure rate | > 5% | > 20% |
| API response time | > 1s | > 3s |
| Database query time | > 500ms | > 2s |
| Queue depth (backlog) | > 100 jobs | > 500 jobs |
| Disk usage | > 70% | > 90% |

---

## Open Questions / Gaps

- [ ] Who sees the Monitoring Center? Admins only or all users?
- [ ] Are health scores per-property or per-client aggregate?
- [ ] How are health score calculation formulas versioned as the platform evolves?
- [ ] Is there a public status page for clients?
- [ ] What tool is used for infrastructure monitoring (Grafana? Cloud Monitoring?)?
