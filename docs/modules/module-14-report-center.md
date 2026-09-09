# Module 14: Report Center

**Phase:** 1 | **Priority:** High — core client deliverable

---

## Report Types

| Report | Cadence | Contents |
|--------|---------|---------|
| Weekly | Every Monday | 7-day performance summary |
| Monthly | 1st of each month | Full month KPIs + rankings + insights |
| Quarterly | End of quarter | Quarter summary + trends + recommendations |
| Annual | January 1 | Full year review + year-over-year |

---

## Export Formats

| Format | Use Case |
|--------|---------|
| PDF | Client-ready formatted report |
| CSV | Raw data for analysis in Excel/Sheets |
| Excel (.xlsx) | Formatted spreadsheet with charts |

---

## Automatic Scheduling

| Feature | Description |
|---------|-------------|
| Auto-generate | Reports generated automatically on schedule |
| Email delivery | Report sent to configured email addresses |
| Dashboard access | All reports accessible in Report Center UI |
| Retention | Reports stored for 24 months |

---

## Report Contents (Monthly — Example)

```
Section 1: Executive Summary
  - Overall SEO Health Score
  - Key wins this month
  - Key issues this month

Section 2: Traffic Performance
  - Organic clicks (vs last month + YoY)
  - Organic sessions
  - Impressions
  - CTR
  - Average position

Section 3: Keyword Performance
  - Top 10 keywords (by clicks)
  - Rising keywords (top 5)
  - Dropping keywords (top 5)
  - New keywords discovered

Section 4: Landing Page Performance
  - Top 10 pages by traffic
  - Top 10 pages by conversions

Section 5: AI Traffic
  - AI sessions by platform
  - AI conversion rate

Section 6: Technical SEO
  - Core Web Vitals status
  - Issues found and resolved

Section 7: Recommendations (AI-generated)
  - Top 3 opportunities
  - Top 3 issues to fix
```

---

## PDF Generation

**Recommended library:** Puppeteer (render HTML report as PDF) or `@react-pdf/renderer`

```
1. Report data fetched from PostgreSQL
2. React component renders report template
3. Puppeteer captures as PDF
4. PDF stored in Google Cloud Storage
5. Download link stored in `reports` table
6. Email sent with link or attachment
```

---

## Database Table: `reports`

| Column | Type |
|--------|------|
| id | UUID |
| project_id | UUID |
| type | ENUM (weekly, monthly, quarterly, annual, custom) |
| period_start | DATE |
| period_end | DATE |
| file_url | TEXT (GCS URL) |
| status | ENUM (generating, ready, failed) |
| created_at | TIMESTAMP |

---

## White-Label Considerations (Not in Blueprint)

For agencies sharing reports with clients:
- [ ] Agency logo on report cover page
- [ ] Client branding (colors, logo)
- [ ] Remove platform branding
- [ ] Custom report title

**White-label not mentioned in blueprint. Needs decision.**

---

## Open Questions / Gaps

- [ ] **PDF library** not specified — Puppeteer vs @react-pdf/renderer vs WeasyPrint
- [ ] **File storage** not in architecture — Google Cloud Storage needed
- [ ] **Email provider** not chosen — needed to deliver reports via email
- [ ] Can users create custom reports (select custom date range + sections)?
- [ ] Can clients access reports without logging into the platform? (public link?)
- [ ] Is there a report preview in the dashboard before downloading?
- [ ] Can reports be white-labeled with agency branding?
- [ ] Excel export — which library? (ExcelJS recommended for NestJS)
