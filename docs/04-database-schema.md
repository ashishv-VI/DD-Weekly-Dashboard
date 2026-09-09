# Database Schema

## Schema Groups

### Core Tables

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `users` | Authenticated users | id, email, google_id, refresh_token, created_at |
| `clients` | Agency clients | id, name, agency_id, created_at |
| `projects` | Client projects/domains | id, client_id, name, domain, created_at |
| `properties` | GA4 + GSC property links | id, project_id, ga4_property_id, gsc_site_url, type |

### Analytics Tables

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `ga4_data` | Daily GA4 metrics per property | id, property_id, date, sessions, users, engaged_sessions, conversions, revenue, channel |
| `gsc_data` | Daily GSC metrics per property | id, property_id, date, clicks, impressions, ctr, position |
| `keywords` | Keyword performance over time | id, property_id, keyword, date, clicks, impressions, ctr, position, device, country |
| `landing_pages` | Landing page performance | id, property_id, url, date, clicks, sessions, conversions, revenue, position |
| `conversions` | Conversion events | id, property_id, event_name, date, count, revenue, source, medium |

### AI Tables

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `ai_traffic` | Traffic from AI platforms | id, property_id, date, platform, sessions, users, conversions, landing_url |
| `ai_mentions` | AI platform mentions (GEO) | id, property_id, date, platform, query, mention_type, url, snippet |
| `ai_citations` | AI citation tracking | id, property_id, date, platform, query, cited_url, position |

### System Tables

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `alerts` | Generated alerts | id, project_id, type, severity, message, status, triggered_at |
| `reports` | Generated reports | id, project_id, type, period, file_url, status, created_at |
| `audit_logs` | User action audit trail | id, user_id, action, resource, metadata, created_at |
| `sync_logs` | Data sync job logs | id, property_id, job_type, status, started_at, completed_at, error |
| `insights` | AI-generated insights | id, project_id, type, title, body, priority, created_at, expires_at |

---

## Proposed Additional Tables (Gaps)

| Table | Reason Needed |
|-------|--------------|
| `competitors` | Competitor Intelligence module has no backing table |
| `competitor_keywords` | Keyword gap analysis data storage |
| `technical_audits` | Technical SEO audit results per crawl |
| `crawl_pages` | Individual page crawl results |
| `schema_validations` | Schema monitoring results per page |
| `core_web_vitals` | CWV metrics per property per date |
| `geo_scores` | GEO score history per property |
| `health_scores` | Historical health score tracking |
| `agencies` | Top-level agency entity (above clients) |
| `sessions` | User session tracking for security audit |

---

## Multi-Tenancy Strategy

**Recommended approach: Row-level tenant isolation**

Every analytics table includes `project_id` or `property_id` which links back to a `client_id`. All queries must include tenant filtering at the repository layer.

```sql
-- Example: All queries scoped to project
SELECT * FROM gsc_data
WHERE property_id = $1
  AND date BETWEEN $2 AND $3;
```

- No cross-client data leakage possible if filtering is enforced at service layer
- PostgreSQL Row Level Security (RLS) as an additional safety net
- Never expose raw IDs in API responses — use UUIDs

---

## Data Retention Policy (Proposed — Not in Blueprint)

| Data Type | Retention |
|-----------|-----------|
| Raw GA4 / GSC daily data | 36 months |
| Keywords | 24 months |
| AI traffic | 24 months |
| Insights | 90 days (rolling) |
| Alerts | 12 months |
| Audit logs | 7 years (compliance) |
| Sync logs | 30 days |
| Reports (files) | 24 months |
