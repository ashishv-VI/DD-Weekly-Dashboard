# Module 11: GEO & AI Visibility Dashboard

**Phase:** 3 | **Priority:** Medium | **Status:** CRITICAL GAP — methodology unresolved

---

## What Is GEO?

Generative Engine Optimization (GEO) is the practice of optimizing content to appear in AI-generated answers from platforms like ChatGPT, Gemini, Perplexity, and Claude — similar to traditional SEO but for AI outputs.

---

## Metrics

| Metric | Description |
|--------|-------------|
| AI Mentions | Times the brand/domain is mentioned in AI-generated answers |
| AI Citations | Times the domain is cited as a source in AI answers |
| AI Overview Visibility | Appearances in Google AI Overviews (SGE) |
| GEO Score | Composite score for GEO optimization readiness |
| AI Visibility Score | Composite score for actual AI visibility |

---

## Platforms Tracked

| Platform | Tracking Method | Feasibility |
|----------|----------------|-------------|
| ChatGPT | No public API for citation data | Low — sampling only |
| Gemini | No public citation API | Low — sampling only |
| Perplexity | Perplexity API (limited) | Medium |
| Claude | No public citation API | Low — sampling only |
| Google AI Overviews | GSC may surface some data | Medium |

---

## CRITICAL GAP: No Reliable Data Source Exists

**The Problem:**
- ChatGPT, Gemini, and Claude do not expose an API for:
  - Which domains they cite
  - How often they mention a brand
  - What queries they're answering where the domain appears

**Current Reality:**
- The only way to track AI mentions is to manually (or programmatically) query AI platforms with target keywords and check if the domain appears in the response.
- This is expensive (LLM API costs), slow, not scalable, and not deterministic.

---

## Proposed Methodology (Phase 3 Decision Required)

### Option A: Query Sampling
1. Define a list of target keywords per client
2. Nightly job queries ChatGPT/Gemini/Perplexity API with each keyword
3. Parse response to check if client domain is mentioned or cited
4. Store result in `ai_mentions` table
5. **Cost:** ~$0.01–$0.10 per keyword per platform per night
6. **Accuracy:** Represents sampled queries, not all possible queries

### Option B: Third-Party Tool Integration
Tools like BrightEdge, Conductor, Semrush (AI features), or Authoritas claim to track AI visibility.
- **Cost:** $3,000+/month
- **Coverage:** Better but still not comprehensive

### Option C: Perplexity API Only (Phase 3 MVP)
Perplexity has a more accessible API with citation data.
- Build Phase 3 around Perplexity only
- Expand to other platforms as APIs mature

---

## GEO Score — Proposed Formula

| Factor | Weight | Measurement |
|--------|--------|-------------|
| Structured data completeness | 25% | Schema coverage from Module 10 |
| FAQ/How-to content | 20% | Pages with FAQ schema |
| E-E-A-T signals | 20% | Author schema, date published, citations |
| Page speed (LCP) | 15% | CrUX data from Module 9 |
| Mobile usability | 10% | CrUX mobile pass rate |
| Content length / depth | 10% | Average word count (requires crawler) |

---

## AI Visibility Score — Proposed Formula

| Factor | Weight | Measurement |
|--------|--------|-------------|
| AI mentions per week | 30% | From query sampling |
| AI citations per week | 30% | From query sampling |
| AI Overview appearances | 20% | GSC data (if available) |
| Trend direction | 20% | Week-over-week change |

---

## Database Tables

### `ai_mentions`
| Column | Type |
|--------|------|
| id | UUID |
| property_id | UUID |
| date | DATE |
| platform | VARCHAR |
| query | TEXT |
| mention_type | ENUM (mention, citation) |
| url | VARCHAR |
| snippet | TEXT |
| position | INTEGER |

### `ai_citations`
| Column | Type |
|--------|------|
| id | UUID |
| property_id | UUID |
| date | DATE |
| platform | VARCHAR |
| query | TEXT |
| cited_url | VARCHAR |
| position | INTEGER |

---

## Open Questions / Gaps (Must Resolve Before Phase 3)

- [ ] **What is the tracking methodology?** (Option A, B, or C above?)
- [ ] **Which keywords are sampled?** User-defined? Auto-generated from GSC top keywords?
- [ ] **What is the API cost budget for query sampling?**
- [ ] **How is "mention" defined?** Brand name in response text? Domain cited? Both?
- [ ] **How is Google AI Overview data obtained?** GSC does not reliably expose this.
- [ ] **Are clients informed that this data is sampled and approximate?**
- [ ] **Phase 3 blocker** — This module cannot be built without resolving the above.
