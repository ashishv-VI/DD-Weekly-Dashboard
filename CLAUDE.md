@AGENTS.md

# ⚠️ PROTECTED CODE — DO NOT TOUCH

## Leads Button in Client Dashboard

**File:** `src/app/(client)/client/dashboard/page.tsx`

The **Leads button** in the client dashboard tab bar MUST always remain visible.

- Do NOT remove the Leads button
- Do NOT wrap it in any conditional (`leadsEnabled`, feature flag, or any other guard)
- Do NOT move it or change its `onClick` (it navigates to `/client/leads`)
- Do NOT delete or comment it out during any refactor, merge, or cleanup

The button currently lives just after the main tabs loop and looks like this:

```tsx
<button title="Leads" className="..." onClick={() => router.push("/client/leads")}>
  <svg .../>Leads
</button>
```

**This button must always be rendered unconditionally — no `{condition && ...}` wrapper.**

If you are making changes to the dashboard page, leave this button exactly as-is.
