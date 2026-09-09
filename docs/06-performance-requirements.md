# Performance Requirements

## Targets

| Metric | Target | How to Achieve |
|--------|--------|---------------|
| Dashboard Load Time | < 2 seconds | Redis cache for all dashboard queries |
| API Response Time | < 500 ms | Indexed PostgreSQL queries, Redis cache |
| Sync Success Rate | > 99% | BullMQ retry, dead letter queue, monitoring |
| Data Accuracy | > 99% | QA Agent validation nightly, data checksums |
| Mobile Responsive | All devices | Tailwind responsive classes, mobile-first design |

---

## Caching Strategy

### What Gets Cached (Redis)

| Data | TTL | Invalidation |
|------|-----|-------------|
| Executive dashboard KPIs | 4 hours | On sync job completion |
| Keyword tables (GSC) | 4 hours | On sync job completion |
| AI traffic data | 4 hours | On processing job completion |
| Historical charts | 12 hours | On sync job completion |
| Report file URLs | 24 hours | On report regeneration |
| User session | 30 days | On logout or token revocation |

### Cache Key Pattern

```
{tenant}:{module}:{property_id}:{date_range}:{filter_hash}
```

Example:
```
client_123:gsc:prop_456:last30days:all
```

---

## Database Performance

### Required Indexes

| Table | Index Columns | Reason |
|-------|--------------|--------|
| `gsc_data` | (property_id, date) | All time-range queries |
| `keywords` | (property_id, date, keyword) | Keyword search and filter |
| `keywords` | (property_id, position) | Opportunity engine queries |
| `ga4_data` | (property_id, date, channel) | Channel breakdown queries |
| `ai_traffic` | (property_id, date, platform) | AI platform filter queries |
| `landing_pages` | (property_id, url, date) | URL-level queries |
| `alerts` | (project_id, status, triggered_at) | Alert center queries |

### Query Patterns to Optimize

| Query Type | Strategy |
|------------|---------|
| Date range aggregation | Pre-aggregate daily → weekly/monthly in separate job |
| Keyword position tracking | Materialized view for position change calculations |
| Top 10 pages | Partial index on clicks DESC |
| Trend calculation | Computed in application layer, cached |

---

## Load Targets by Module

| Module | Expected Load | Cache Strategy |
|--------|-------------|----------------|
| Executive Dashboard | < 1.5s | Full Redis cache |
| Keyword Tables (5,000+ rows) | < 2s | Paginated + Redis |
| Historical Charts | < 1.5s | Redis pre-computed |
| Competitor Intelligence | < 3s | Acceptable — complex query |
| Report Generation (PDF) | < 30s | Background job, not real-time |

---

## Open Questions / Gaps

- [ ] What is the expected number of concurrent users at peak?
- [ ] What is the maximum number of keywords per property (could be 50,000+)?
- [ ] Is server-side pagination required for keyword tables?
- [ ] What CDN strategy is used for static assets?
- [ ] Are there SLA commitments to clients?
