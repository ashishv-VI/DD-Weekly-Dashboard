# Module 4: Search Console Dashboard

**Phase:** 1 | **Priority:** High — core SEO data

---

## Metrics

| Metric | Source | Description |
|--------|--------|-------------|
| Clicks | GSC | Total organic clicks for the period |
| Impressions | GSC | Total search impressions |
| CTR | GSC | Click-through rate |
| Average Position | GSC | Mean ranking position |

---

## Keyword Intelligence

| Category | Definition | Use |
|----------|-----------|-----|
| Top Keywords | Highest clicks in period | Show what's driving traffic |
| Rising Keywords | Position improved vs previous period | Show momentum |
| Dropping Keywords | Position worsened vs previous period | Flag for attention |
| Lost Keywords | Had impressions previously, now zero | Alert — traffic loss risk |
| New Keywords | First appeared in current period | Show growth opportunities |

---

## Opportunity Engine

| Opportunity Type | Filter Logic | Why It Matters |
|-----------------|-------------|---------------|
| Position 4–10 | `position BETWEEN 4 AND 10` | Close to top 3, high ROI to improve |
| High Impression, Low CTR | `impressions > threshold AND ctr < 3%` | Title/meta desc optimization needed |
| Low CTR Keywords | `ctr < 2% AND clicks > 10` | Underperforming vs exposure |

---

## Keyword Table Columns

| Column | Description |
|--------|-------------|
| Keyword | Search query |
| Clicks | Total clicks in period |
| Impressions | Total impressions |
| CTR | Click-through rate |
| Position | Average position |
| Position Change | vs previous period (▲▼) |
| Device | All / Mobile / Desktop / Tablet |
| Country | All or filtered by country |

---

## Filters & Controls

| Filter | Options |
|--------|---------|
| Date range | 7d, 30d, 90d, custom |
| Device | All, Mobile, Desktop, Tablet |
| Country | All or specific country |
| Search type | Web, Image, Video, News |
| Keyword search | Full-text search on keyword column |
| Category | All, Rising, Dropping, Lost, New, Opportunities |

---

## Charts Required

| Chart | Type | Data |
|-------|------|------|
| Clicks + Impressions trend | Dual-axis line | Daily over period |
| CTR trend | Line chart | Daily CTR |
| Position trend | Line chart | Daily avg position (inverted Y axis) |
| Position distribution | Bar chart | Buckets: 1-3, 4-10, 11-20, 20+ |

---

## GSC API Query Structure

```json
{
  "startDate": "2026-05-23",
  "endDate": "2026-06-22",
  "dimensions": ["query", "device", "country"],
  "rowLimit": 25000,
  "startRow": 0
}
```

**Note:** Max 25,000 rows per request. For large sites use pagination via `startRow`. GSC quota is 2,000 requests/day per project.

---

## Open Questions / Gaps

- [ ] For large sites with 50,000+ keywords — is pagination handled in UI?
- [ ] How is "Rising" defined? Top 10% position improvement? Absolute threshold?
- [ ] How is "Lost" defined? Zero impressions for X days? Threshold?
- [ ] How is "New" defined? First appearance ever or first in the date range?
- [ ] Is keyword categorization (branded vs non-branded) in scope?
- [ ] Can users export keyword data to CSV?
- [ ] Are annotations (Google algorithm updates) shown on trend charts?
