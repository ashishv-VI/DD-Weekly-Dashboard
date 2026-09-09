# AI Data Analyst Agent

**Phase:** 4 | **Runs:** Nightly at 3:30 AM | **Output:** Data Quality Report + Anomalies

---

## Responsibilities

| Task | Description |
|------|-------------|
| Data Validation | Verify synced data is complete and not corrupted |
| Data Accuracy Verification | Cross-check GA4 data against GSC data for consistency |
| Anomaly Detection | Flag unexpected spikes or drops that aren't explained by trends |

---

## Input Context (Fed to LLM)

```
Property: {domain}
Sync status: GA4 synced {n} rows, GSC synced {n} rows

Data validation checks:
  - GA4 clicks today: {value}
  - GSC clicks today: {value}
  - Difference: {%} (acceptable range: < 10%)
  - Zero-traffic days detected: {list}
  - Unusually large day (spike): {date}, {value} vs rolling avg {value}
  - Unusually small day (drop): {date}, {value} vs rolling avg {value}

Anomalies:
  - {metric} spiked {X}% on {date} — possible causes: [holiday, campaign, viral content]
  - {metric} dropped {X}% on {date} — possible causes: [tracking issue, algorithm update]
```

---

## Anomaly Detection Logic (Rule-Based + AI)

Rule-based checks run first:
```
IF today_clicks < (7_day_rolling_avg × 0.5) → flag as anomaly
IF today_sessions > (7_day_rolling_avg × 2.0) → flag as spike
IF ga4_sessions vs gsc_clicks diverge > 20% → flag data discrepancy
IF any metric is exactly 0 on a non-holiday weekday → flag as tracking issue
```

AI agent then contextualizes flagged anomalies.

---

## Output Format (Structured JSON)

```json
{
  "data_quality_score": 96,
  "validation_passed": true,
  "issues": [
    {
      "type": "data_gap",
      "date": "2026-06-18",
      "metric": "sessions",
      "value": 0,
      "explanation": "Zero sessions recorded on a Wednesday suggests a GA4 tracking outage. Check GA4 property for tag firing issues.",
      "severity": "high"
    }
  ],
  "anomalies": [
    {
      "type": "spike",
      "date": "2026-06-15",
      "metric": "organic_sessions",
      "value": 4200,
      "baseline": 1800,
      "change_pct": 133,
      "possible_causes": ["Content went viral", "Backlink from high-authority site", "Featured snippet acquired"],
      "recommended_action": "Identify the source page and keyword driving the spike to replicate success."
    }
  ]
}
```

---

## Open Questions / Gaps

- [ ] What is the acceptable % difference between GA4 and GSC click counts?
- [ ] How are holidays handled in anomaly detection (expected zero-traffic days)?
- [ ] Can users mark anomalies as "explained" to prevent repeat flagging?
- [ ] Should data gaps trigger an immediate alert rather than waiting for the morning job?
