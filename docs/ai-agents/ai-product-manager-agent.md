# AI Product Manager Agent

**Phase:** 4 | **Runs:** Weekly | **Output:** Product Quality Assessment

---

## Responsibilities

| Task | Description |
|------|-------------|
| Feature Review | Assess whether new features meet requirements |
| Workflow Review | Verify user workflows are complete and logical |
| Product Quality Assessment | Overall platform quality score |

---

## Scope

This agent acts as an automated product manager — reviewing the platform against the original requirements to ensure nothing is missing, broken, or misaligned.

---

## Input Context (Fed to LLM)

```
Requirements checklist: [all 15 modules + features]
Recently shipped features: [{list from changelog}]
Open issues: [{list}]
User complaints or feedback: [{list}]
QA Agent report: [{last report}]
UX Agent report: [{last report}]
```

---

## Output Format

```json
{
  "product_quality_score": 88,
  "phase_1_completion": "94%",
  "summary": "Phase 1 is nearly complete. Report scheduling is missing email delivery.",
  "gaps_found": [
    {
      "feature": "Report Center — Email delivery",
      "status": "missing",
      "impact": "high",
      "recommendation": "Implement email delivery for monthly reports before client launch."
    }
  ],
  "workflow_issues": [
    {
      "workflow": "New project setup",
      "issue": "No confirmation step before GA4 property is linked",
      "recommendation": "Add a review step showing which property will be linked before saving."
    }
  ],
  "positive_findings": [
    "Keyword opportunity engine is working correctly and surfacing relevant keywords",
    "Date filter state persists correctly across page navigation"
  ]
}
```

---

## Open Questions / Gaps

- [ ] How does the agent "review" features? Only from changelogs or does it interact with the platform?
- [ ] Who receives this report? Only the internal development team?
- [ ] How is the product quality score weighted?
- [ ] Can this agent automatically create tickets in a project management tool (Jira/Linear)?
