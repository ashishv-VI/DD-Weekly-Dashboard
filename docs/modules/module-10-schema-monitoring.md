# Module 10: Schema Monitoring

**Phase:** 2 | **Priority:** Medium

---

## Schema Types Tracked

| Schema Type | Common Use Case |
|-------------|----------------|
| FAQ Schema | FAQ pages, support content |
| Article Schema | Blog posts, news articles |
| Product Schema | E-commerce product pages |
| Organization Schema | Homepage, about page |
| Breadcrumb Schema | Navigation path on all pages |

---

## Validation Checks

| Check | Description |
|-------|-------------|
| Missing Schema | Pages that should have schema but don't |
| Invalid Schema | Schema present but fails validation |
| Rich Result Eligibility | Whether schema qualifies for Google rich results |

---

## Data Source

Requires web crawler to:
1. Fetch each page HTML
2. Extract JSON-LD blocks (`<script type="application/ld+json">`)
3. Extract Microdata attributes
4. Validate against Schema.org spec
5. Check against Google's rich result requirements

---

## Dashboard Layout (Proposed)

```
┌──────────────────────────────────────────────┐
│  Schema Coverage: 74% of pages have schema  │
├────────────┬───────────┬─────────────────────┤
│ FAQ Schema │ Article   │ Product Schema       │
│ 45/60 pgs  │ 38/42 pgs │ 120/150 pgs         │
│ 75%        │ 90%       │ 80%                  │
├────────────┴───────────┴─────────────────────┤
│  Issues Table                                │
│  URL | Schema Type | Issue | Severity        │
│  /faq | FAQ | Invalid property 'answer' | High│
│  /about | Org | Missing required field | Med │
└──────────────────────────────────────────────┘
```

---

## Schema Validation Logic

```
For each crawled page:
  1. Extract all JSON-LD scripts
  2. Parse JSON
  3. Identify @type (FAQPage, Article, Product, etc.)
  4. Validate required properties against Schema.org spec
  5. Check Google rich result requirements:
     - FAQ: requires Question + acceptedAnswer
     - Article: requires headline, datePublished, author
     - Product: requires name, image, offers
  6. Flag missing or invalid fields
  7. Store in schema_validations table
```

---

## Database Table: `schema_validations`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | |
| project_id | UUID | FK |
| url | VARCHAR | Page URL |
| schema_type | VARCHAR | FAQPage, Article, Product, etc. |
| is_present | BOOLEAN | Schema found on page |
| is_valid | BOOLEAN | Passes validation |
| rich_result_eligible | BOOLEAN | Meets Google requirements |
| issues | JSONB | Array of issue objects |
| crawled_at | TIMESTAMP | |

---

## Google Rich Results Tool Integration

Google provides a testing API for rich results:
- `https://searchconsole.googleapis.com/v1/urlTestingTools/richResultsTest:run`
- Can be used to validate specific URLs
- Rate limited — use judiciously

---

## Open Questions / Gaps

- [ ] **Requires crawler** — Same crawler as Module 9. Shared infrastructure.
- [ ] How are dynamically rendered schema (via JavaScript) handled? Need Playwright.
- [ ] Does the platform suggest fixes for invalid schema?
- [ ] Are schema changes tracked over time (was valid last week, broken this week)?
- [ ] Is there integration with Google's Rich Results Test?
- [ ] Which schema types are prioritized for Phase 2 vs later?
- [ ] How does the system know which pages "should" have which schema type?
