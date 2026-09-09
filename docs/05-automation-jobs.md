# Automation Jobs

## Nightly Pipeline Schedule

| Time | Job | Input | Output |
|------|-----|-------|--------|
| 2:00 AM | GA4 Sync | GA4 API | `ga4_data` table updated |
| 2:30 AM | GSC Sync | GSC API | `gsc_data`, `keywords`, `landing_pages` updated |
| 3:00 AM | AI Traffic Processing | `ga4_data` referrer analysis | `ai_traffic` table updated |
| 3:30 AM | Insight Generation | All analytics tables | `insights` table populated |
| 4:00 AM | Alert Generation | Insights + thresholds | `alerts` table populated |
| 4:30 AM | QA Agent Validation | Full platform | System Health Score updated |
| 5:00 AM | Report Generation | All data | PDFs/CSVs generated, `reports` table updated |

---

## Job Queue Architecture (BullMQ)

### Queues

| Queue | Jobs | Concurrency |
|-------|------|-------------|
| `sync-queue` | GA4 sync, GSC sync | 5 (one per property in parallel) |
| `processing-queue` | AI traffic processing | 3 |
| `insight-queue` | Insight generation | 2 |
| `alert-queue` | Alert generation | 5 |
| `report-queue` | Report generation | 2 |
| `qa-queue` | QA agent validation | 1 |

### Job Retry Strategy

| Scenario | Behavior |
|----------|---------|
| API rate limit hit | Exponential backoff, max 3 retries |
| Network timeout | Retry after 30 seconds, max 3 retries |
| Auth token expired | Refresh token and retry once |
| Permanent failure | Move to dead letter queue, send alert |

---

## GA4 Sync Job — Detail

```
For each property:
  1. Check last sync timestamp
  2. Request GA4 Data API for missing date range
  3. Handle pagination (rowCount > limit)
  4. Upsert into ga4_data table
  5. Update sync_logs with status
  6. Refresh Redis cache for this property
```

**API Used:** Google Analytics Data API v1 (`runReport`)
**Quota:** 200,000 tokens/day per project (shared across all properties)
**Risk:** High property count can exhaust quota. Need per-property quota tracking.

---

## GSC Sync Job — Detail

```
For each property:
  1. Check last sync timestamp
  2. Request Search Analytics API for missing date range
  3. Handle row limit (max 25,000 rows per request)
  4. Paginate with startRow offset
  5. Upsert into gsc_data and keywords tables
  6. Update sync_logs with status
```

**API Used:** Google Search Console API v3 (`searchanalytics.query`)
**Quota:** 2,000 requests/day per project (HARD LIMIT)
**Risk:** Critical bottleneck for multi-client setups. Need quota pooling strategy.

---

## AI Traffic Processing Job — Detail

```
For each property:
  1. Read ga4_data for the date
  2. Filter sessions where session_source matches AI platform domains:
     - chat.openai.com / chatgpt.com
     - gemini.google.com
     - perplexity.ai
     - claude.ai
     - copilot.microsoft.com
  3. Group by platform + landing_url
  4. Upsert into ai_traffic table
```

**Note:** This relies on GA4 referrer/source data. Accuracy depends on whether AI platforms pass referrer headers (many do not in all cases).

---

## Open Questions / Gaps

- [ ] What timezone does the nightly schedule run in? UTC recommended.
- [ ] What happens if a job runs for >1 hour and the next job starts?
- [ ] Is there a manual trigger mechanism for admins?
- [ ] Are jobs scoped per-client or per-property? Need clarity on parallelism.
- [ ] Dead letter queue alerts — who gets notified when a job permanently fails?
- [ ] GSC API quota (2,000/day) — with 50 clients this is 40 requests per client per day. Feasible but tight.
