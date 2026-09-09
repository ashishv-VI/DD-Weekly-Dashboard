# Module 6: AI Traffic Dashboard

**Phase:** 2 | **Priority:** High — key differentiator

---

## AI Platforms Tracked

| Platform | Referrer Domain |
|----------|----------------|
| ChatGPT | `chat.openai.com`, `chatgpt.com` |
| Gemini | `gemini.google.com` |
| Perplexity | `perplexity.ai` |
| Claude | `claude.ai` |
| Copilot | `copilot.microsoft.com`, `bing.com/chat` |

---

## Metrics

| Metric | Description |
|--------|-------------|
| AI Sessions | Total sessions originating from AI platforms |
| AI Users | Unique users from AI platforms |
| AI Conversions | Conversion events from AI-sourced sessions |
| AI Conversion Rate | AI Conversions / AI Sessions |

---

## Landing Pages Section

| Column | Description |
|--------|-------------|
| URL | Landing page path |
| AI Platform | Which AI sent the traffic |
| Sessions | AI sessions to this page |
| Conversions | Conversions from AI sessions on this page |
| Conversion Rate | Conversions / Sessions |
| Trend | Week-over-week change |

---

## Detection Features

### AI Traffic Drop Detection
- Compares current week AI sessions vs previous week
- Alert threshold: > 20% drop triggers alert
- Broken down by platform (e.g. "ChatGPT traffic dropped 40%")

### AI Growth Detection
- Highlights platforms with > 10% week-over-week growth
- Surfaces new AI platforms appearing for the first time

---

## Charts Required

| Chart | Type | Data |
|-------|------|------|
| AI traffic trend | Multi-line chart | Daily sessions per AI platform |
| Platform breakdown | Donut chart | Sessions by platform |
| AI vs total traffic | Stacked bar | AI share vs non-AI |
| AI conversions trend | Line chart | Daily AI conversions |
| Top AI landing pages | Table | URL, sessions, conversions |

---

## Detection Methodology

```
1. Nightly job reads ga4_data for yesterday
2. Filters sessions where session_source IN (AI domains list)
3. Groups by: platform, landing_url, date
4. Inserts into ai_traffic table
5. Compares with previous 7-day average
6. If drop > threshold → create alert record
7. If growth detected → create insight record
```

---

## Limitations & Disclaimers (Must Show in UI)

| Limitation | Impact |
|------------|--------|
| Not all AI platforms send referrer headers | Some AI traffic is counted as "Direct" — actual AI traffic is higher than shown |
| ChatGPT app (iOS/Android) does not pass referrers | Mobile ChatGPT traffic is missed |
| Dark traffic from AI is unattributable | True AI traffic volume is likely 20-40% higher than tracked |
| GA4 data has 24-48h delay | Yesterday's data available this morning |

---

## Open Questions / Gaps

- [ ] Should "Unknown/Dark Traffic" be estimated and shown as a range?
- [ ] Can users add custom AI platform referrer domains?
- [ ] Is there a view for AI traffic by country?
- [ ] Should AI traffic appear in GA4 channel grouping as a custom channel?
- [ ] How should AI conversion rate be compared to organic conversion rate?
