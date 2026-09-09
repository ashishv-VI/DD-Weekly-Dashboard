# Module 8: Historical Performance

**Phase:** 1 | **Priority:** Medium

---

## Views

| View | Date Grouping | Max Range |
|------|-------------|-----------|
| Weekly | ISO week | All time |
| Monthly | Calendar month | All time |
| Quarterly | Q1/Q2/Q3/Q4 | All time |
| Yearly | Calendar year | All time |
| All Time | No grouping | Full history |

---

## Metrics Tracked Over Time

| Metric | Source |
|--------|--------|
| Traffic Growth | GA4 sessions + GSC clicks |
| Ranking Growth | GSC average position trend |
| Conversion Growth | GA4 conversions |
| AI Growth | ai_traffic sessions |

---

## Charts Required

| Chart | Type | Data |
|-------|------|------|
| Long-term traffic trend | Line chart | Monthly sessions + clicks |
| Ranking trend | Line chart | Monthly avg position (inverted) |
| Conversion trend | Line chart | Monthly conversions |
| AI traffic growth | Line chart | Monthly AI sessions |
| Year-over-year comparison | Grouped bar | Current year vs previous year |
| Growth rate table | Table | Period, metric, value, YoY % change |

---

## Data Aggregation Strategy

Raw data in `ga4_data` and `gsc_data` is stored daily. Historical views aggregate on read:

```sql
-- Monthly aggregation example
SELECT
  DATE_TRUNC('month', date) AS period,
  SUM(clicks) AS total_clicks,
  SUM(sessions) AS total_sessions,
  AVG(position) AS avg_position,
  SUM(conversions) AS total_conversions
FROM gsc_data
WHERE property_id = $1
GROUP BY DATE_TRUNC('month', date)
ORDER BY period;
```

**Performance note:** Pre-aggregate into materialized views for Weekly/Monthly/Quarterly to avoid slow queries on large datasets.

---

## Comparison Feature

| Comparison Type | Description |
|----------------|-------------|
| YoY (Year over Year) | Compare same period last year |
| MoM (Month over Month) | Compare previous month |
| Custom | User selects two date ranges |

---

## Open Questions / Gaps

- [ ] How far back does historical data go? Limited by when the user first connected their property.
- [ ] What is the minimum data required before historical charts are meaningful?
- [ ] Are annotations (Google algorithm updates, site migrations) shown?
- [ ] Can users download historical data as CSV?
- [ ] Is there a "benchmark" feature to compare against industry averages?
- [ ] Is there a seasonality view (traffic patterns by week of year)?
