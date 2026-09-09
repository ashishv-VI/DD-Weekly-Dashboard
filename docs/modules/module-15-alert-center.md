# Module 15: Alert Center

**Phase:** 2 | **Priority:** High — proactive value delivery

---

## Alert Types

| Alert Type | Trigger | Severity |
|------------|---------|---------|
| Traffic Drop | Organic sessions drop > 20% week-over-week | Critical |
| Ranking Drop | Average position drops > 5 positions | High |
| Conversion Drop | Conversions drop > 25% week-over-week | Critical |
| AI Traffic Drop | AI sessions drop > 30% week-over-week | High |
| Indexing Issues | Indexed pages drop > 5% | Critical |
| Technical SEO Issues | New broken links, crawl errors detected | Medium |
| Keyword Lost | Keyword drops from top 20 to unranked | High |
| New Opportunity | Keyword moves into position 4–10 | Info |
| Core Web Vitals Failure | LCP/CLS/INP fails threshold | High |
| Sitemap Error | Sitemap returns error or missing URLs | Medium |

---

## Delivery Channels

| Channel | Status | Notes |
|---------|--------|-------|
| Dashboard | Phase 2 | In-app notification center |
| Email | Phase 2 | Requires email provider (SendGrid/Resend) |
| Slack | Phase 2 | Requires Slack webhook integration |
| WhatsApp | Phase 3 | Requires WhatsApp Business API (Meta approval) |

---

## Alert Configuration

| Setting | Description |
|---------|-------------|
| Alert type | Which alerts are enabled |
| Threshold | Custom threshold per alert type |
| Recipients | Who receives the alert (email/Slack) |
| Frequency | Immediate, daily digest, weekly summary |
| Silence period | Suppress alerts for X hours after firing |

---

## Dashboard — Alert Center UI

```
┌──────────────────────────────────────────────────────┐
│  Alert Center — 3 Active Alerts                     │
├────────┬────────────────────┬──────────┬────────────┤
│ Status │ Alert              │ Severity │ Detected   │
├────────┼────────────────────┼──────────┼────────────┤
│ 🔴 New │ Traffic dropped 34%│ Critical │ 2h ago     │
│ 🟡 New │ Ranking drop p8→p14│ High     │ 6h ago     │
│ 🟢 OK  │ Indexing restored  │ Resolved │ 1d ago     │
└────────┴────────────────────┴──────────┴────────────┘
```

---

## Alert Generation Logic

```
Nightly at 4:00 AM:
  For each project:
    1. Load today's data + previous 7-day average
    2. For each alert rule:
       a. Calculate metric value
       b. Compare to threshold
       c. If threshold breached and no active alert exists:
          → Create alert record (status: active)
          → Queue delivery jobs (email, Slack, etc.)
    3. For each previously active alert:
       a. Check if condition is still true
       b. If resolved → update status to resolved
```

---

## Database Table: `alerts`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | |
| project_id | UUID | FK |
| type | ENUM | traffic_drop, ranking_drop, etc. |
| severity | ENUM | critical, high, medium, low, info |
| message | TEXT | Human-readable alert description |
| data | JSONB | Metric values, thresholds, context |
| status | ENUM | active, resolved, acknowledged |
| triggered_at | TIMESTAMP | |
| resolved_at | TIMESTAMP | |
| acknowledged_by | UUID | FK to users |

---

## Slack Integration Setup

```
1. User generates Slack webhook URL in Slack workspace
2. User pastes webhook URL in Alert Center settings
3. Platform sends POST to webhook URL when alert fires

Message format:
{
  "text": "🚨 Traffic Alert — Acme Corp",
  "blocks": [
    { "type": "section", "text": "Organic traffic dropped 34% this week" },
    { "type": "section", "text": "Current: 8,200 sessions | Previous: 12,400 sessions" },
    { "type": "actions", "elements": [{ "text": "View Dashboard" }] }
  ]
}
```

---

## WhatsApp Integration (Phase 3)

Requires WhatsApp Business API:
1. Apply for Meta Business Manager access
2. Set up phone number for business messaging
3. Template messages must be pre-approved by Meta
4. **Lead time: 2–4 weeks for approval**

---

## Open Questions / Gaps

- [ ] Can users customize alert thresholds per project?
- [ ] Is there an alert history / log view?
- [ ] Can alerts be snoozed? Acknowledged without resolving?
- [ ] What is the default threshold for each alert type? Blueprint doesn't specify.
- [ ] **Email provider not chosen** — Required before Phase 2 email alerts
- [ ] **WhatsApp Business API** — Approval process should start in Phase 1
- [ ] Are alerts sent immediately when triggered or batched into a daily digest?
- [ ] Can multiple Slack channels be configured (e.g., one per client)?
