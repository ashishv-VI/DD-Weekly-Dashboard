# Module 5: Analytics Dashboard

**Phase:** 1 | **Priority:** High — GA4 traffic data

---

## Metrics

| Metric | GA4 Event / Dimension | Description |
|--------|----------------------|-------------|
| Users | `totalUsers` | Unique users in period |
| Sessions | `sessions` | Total sessions |
| Engaged Sessions | `engagedSessions` | Sessions > 10s or 2+ pages |
| Engagement Rate | `engagementRate` | Engaged sessions / Total sessions |
| Avg Engagement Time | `averageSessionDuration` | Mean time per session |
| Conversions | `conversions` | Total conversion events |

---

## Channel Breakdown

| Channel | GA4 Channel Grouping |
|---------|---------------------|
| Organic | Organic Search |
| Direct | Direct |
| Referral | Referral |
| Social | Organic Social |
| Paid | Paid Search + Paid Social |
| AI Traffic | Custom — referrer-based (ChatGPT, Gemini, etc.) |

---

## Charts Required

| Chart | Type | Data |
|-------|------|------|
| Sessions trend | Line chart | Daily sessions over period |
| Users trend | Line chart | Daily users over period |
| Channel breakdown | Donut + stacked bar | Sessions by channel |
| Engagement rate trend | Line chart | Daily engagement rate |
| Conversions trend | Line chart | Daily conversions |
| Top landing pages | Table | URL, sessions, bounce rate, conversions |

---

## GA4 API Query Structure

```json
{
  "dateRanges": [
    { "startDate": "30daysAgo", "endDate": "today" }
  ],
  "dimensions": [
    { "name": "date" },
    { "name": "sessionDefaultChannelGroup" }
  ],
  "metrics": [
    { "name": "sessions" },
    { "name": "totalUsers" },
    { "name": "engagedSessions" },
    { "name": "engagementRate" },
    { "name": "averageSessionDuration" },
    { "name": "conversions" }
  ]
}
```

---

## AI Traffic Channel (Special Handling)

AI traffic is NOT a standard GA4 channel grouping. It requires:

1. Query GA4 for `sessionSource` dimension
2. Filter rows where source matches:
   - `chat.openai.com`
   - `chatgpt.com`
   - `gemini.google.com`
   - `perplexity.ai`
   - `claude.ai`
   - `copilot.microsoft.com`
3. Sum sessions and classify as "AI Traffic" channel

---

## Date Filters

Inherits standard date filters from Executive Dashboard:
- Last 7 Days
- Last 30 Days
- Last 90 Days
- Quarterly
- Yearly
- Custom Range

---

## Open Questions / Gaps

- [ ] **Revenue metric** — Only present if GA4 e-commerce is configured. Need null/empty state.
- [ ] **Bounce Rate** — Not mentioned but expected. GA4 now uses Engagement Rate instead.
- [ ] Are custom conversion events tracked, or only GA4 default conversions?
- [ ] Is there a goal/conversion setup UI or does the user configure in GA4?
- [ ] Can users filter by specific conversion event type?
- [ ] Is device breakdown (mobile vs desktop) required in this module?
- [ ] What happens when GA4 data is sampled (large date ranges)?
