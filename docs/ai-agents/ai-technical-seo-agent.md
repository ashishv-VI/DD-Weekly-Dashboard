# AI Technical SEO Agent

**Phase:** 4 | **Runs:** Nightly at 3:30 AM | **Output:** Technical Audit Insights

---

## Responsibilities

| Task | Description |
|------|-------------|
| Technical Audits | Analyze crawler results and flag issues |
| Index Audits | Review indexing coverage and flag excluded pages |
| Core Web Vitals Audits | Interpret CWV data and recommend fixes |

---

## Input Context (Fed to LLM)

```
Property: {domain}
Last crawl: {timestamp}

Core Web Vitals:
  LCP: {value} ({status: good/needs-improvement/poor})
  CLS: {value} ({status})
  INP: {value} ({status})

Crawl Results:
  Total pages crawled: {n}
  Broken links: {count} — [{list of URLs}]
  Redirect chains (3+ hops): {count} — [{list}]
  Canonical issues: {count} — [{list}]
  Missing schema: {count} pages
  Robots.txt blocked pages: {count}

Index Coverage:
  Submitted URLs: {n}
  Indexed URLs: {n}
  Coverage rate: {%}
  Excluded pages: [{reasons}]
```

---

## Output Format (Structured JSON)

```json
{
  "summary": "Technical SEO health is 78/100. 3 critical issues need immediate attention.",
  "critical_issues": [
    {
      "type": "broken_links",
      "count": 7,
      "affected_pages": ["/products/item-123", "/services/old-page"],
      "recommended_action": "Set up 301 redirects or update internal links pointing to these URLs."
    }
  ],
  "cwv_analysis": {
    "lcp": {
      "value": "3.2s",
      "status": "needs_improvement",
      "likely_cause": "Large hero image without lazy loading",
      "recommended_action": "Add loading=lazy to hero image, serve WebP format, use CDN."
    }
  },
  "index_insights": {
    "excluded_count": 45,
    "top_exclusion_reasons": ["Crawled - currently not indexed", "Duplicate without canonical"],
    "recommended_action": "Add canonical tags to duplicate pages, improve content quality on thin pages."
  }
}
```

---

## Open Questions / Gaps

- [ ] Does the agent explain WHY a page might not be indexed or just list the pages?
- [ ] Can the agent detect the cause of CWV failures? (Requires code analysis)
- [ ] How does the agent know which excluded pages are intentional vs accidental?
- [ ] Are technical audit recommendations tracked against historical issues?
