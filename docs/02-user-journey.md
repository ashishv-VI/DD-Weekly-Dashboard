# User Journey

## End-to-End Flow

```
User → Google OAuth Login
         ↓
     System fetches GA4 Accounts + Properties + GSC Properties
         ↓
     User selects Project (Client + Domain)
         ↓
     Dashboard loads
         ↓
     Platform automatically:
       - Syncs Data
       - Generates Insights
       - Detects Issues
       - Creates Reports
       - Runs QA Validation
```

---

## Step-by-Step

### Step 1 — Login
- User visits the platform
- Clicks "Sign in with Google"
- Google OAuth flow completes
- Session is created with encrypted token

### Step 2 — System Fetches Data
After login the system automatically retrieves:
- All GA4 accounts accessible to the user
- All GA4 properties under those accounts
- All GSC properties linked to the user

### Step 3 — Project Selection
- User selects a client from the list
- User selects a domain/property
- Context is set for all dashboard views

### Step 4 — Dashboard Loads
- Executive Dashboard renders KPIs
- Data is pulled from cache (Redis) for fast load
- Target: dashboard loads in under 2 seconds

### Step 5 — Automated Platform Actions
The platform runs these automatically (nightly pipeline):

| Time | Job |
|------|-----|
| 2:00 AM | GA4 Sync |
| 2:30 AM | GSC Sync |
| 3:00 AM | AI Traffic Processing |
| 3:30 AM | Insight Generation |
| 4:00 AM | Alert Generation |
| 4:30 AM | QA Agent Validation |
| 5:00 AM | Report Generation |

---

## Open Questions / Gaps

- [ ] What happens if a user has access to 100+ GA4 properties? Is there pagination or search?
- [ ] Can a user be linked to multiple agencies/clients?
- [ ] Is there a manual "sync now" button for users who want fresh data?
- [ ] What is the onboarding flow for a brand new user with no connected properties?
