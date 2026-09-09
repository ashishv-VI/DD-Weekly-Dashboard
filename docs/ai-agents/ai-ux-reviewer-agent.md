# AI UX Reviewer Agent

**Phase:** 4 | **Runs:** Weekly | **Output:** UX Quality Report

---

## Responsibilities

| Task | Description |
|------|-------------|
| UX Analysis | Review platform flows for usability issues |
| Mobile Review | Check mobile responsiveness and touch interactions |
| Navigation Review | Verify navigation structure is logical and accessible |

---

## Scope

This agent reviews the platform itself (not client websites). It ensures the SEO Intelligence Platform remains usable as features are added.

---

## Input Context (Fed to LLM)

```
Platform version: {version}
Last UX review: {date}
New features added since last review: [{list}]
User feedback (if available): [{list}]
Lighthouse mobile score: {score}
Lighthouse desktop score: {score}
Console errors from last week: [{list}]
```

---

## Checks Performed

| Check | Method |
|-------|--------|
| Mobile responsiveness | Lighthouse CI / Playwright on mobile viewport |
| Navigation depth | Count clicks to reach each module |
| Error states | Check all empty/error states are handled |
| Loading states | Verify all async loads have skeleton/spinner |
| Accessibility | WCAG 2.1 AA check (color contrast, ARIA labels) |
| Form validation | Check all form fields validate correctly |

---

## Output Format

```json
{
  "ux_score": 82,
  "summary": "Platform is generally usable but 3 mobile issues were found after the Alert Center update.",
  "issues": [
    {
      "severity": "medium",
      "module": "Alert Center",
      "issue": "Alert table is not scrollable on mobile — content cut off",
      "recommendation": "Add overflow-x: auto to the alerts table container",
      "screenshot_ref": "alert-center-mobile-overflow.png"
    }
  ],
  "mobile_score": 78,
  "desktop_score": 94,
  "accessibility_issues": 2
}
```

---

## Open Questions / Gaps

- [ ] How does the agent take "screenshots"? Requires Playwright or similar.
- [ ] Is this agent reviewing a staging environment or production?
- [ ] Who receives the UX report? Only internal team?
- [ ] Can the UX agent file GitHub issues automatically?
