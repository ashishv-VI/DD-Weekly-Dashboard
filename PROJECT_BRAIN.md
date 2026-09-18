# PROJECT_BRAIN.md
## DD Weekly Dashboard — Complete Project Context

> **How to use this file:** At the start of any new session, say "Read PROJECT_BRAIN.md" and we pick up exactly where we left off — no re-explaining needed.
> **Keep this updated:** After every session where changes are made, this file must be updated.

---

## 1. What This Project Is

**DD Weekly Dashboard** — A weekly SEO + analytics reporting dashboard for clients (e.g. KodaCars, KodaCare). It pulls live data from Google Analytics 4 (GA4) and Google Search Console (GSC), shows traffic trends, keyword rankings, search performance, and provides AI-generated insights and recommended actions.

**Who uses it:** Digital marketing clients (one dashboard per client, each with their own GA4 property and GSC domain). The Damco team also has an admin view.

**Business goal:** Replace manual weekly PDF reports with a live, interactive dashboard that auto-refreshes data and surfaces insights automatically.

---

## 2. Tech Stack (What Is Actually Built — Not the Blueprint)

| Layer | Technology | Details |
|-------|-----------|---------|
| Framework | **Next.js 15 (App Router)** | React 19, TypeScript strict mode |
| Styling | **Tailwind CSS** | No component library — all custom |
| Database | **Neon Serverless PostgreSQL** | Hosted on Neon (serverless) |
| ORM | **Drizzle ORM** | Type-safe SQL queries |
| Deployment | **Vercel** | Auto-deploys from GitHub `main` branch |
| Charts | **Custom SVG** | No external chart library — all hand-coded SVG paths |
| Auth | **Google OAuth** | Clients log in with Google |
| Data sources | **GA4 API + GSC API** | Google Analytics Data API v1 + Search Console API v3 |

> **Note:** The `docs/` folder describes a planned NestJS + Redis + BullMQ backend. That is the blueprint — it has NOT been built yet. What's actually running is Next.js with server-side API routes hitting Neon PostgreSQL directly via Drizzle.

---

## 3. How It's Connected (Deployment Pipeline)

```
Developer edits code locally
        ↓
git push origin main (GitHub)
https://github.com/ashishv-VI/DD-Weekly-Dashboard
        ↓
Vercel auto-detects push → triggers build
        ↓
npm run build (inside /app directory)
        ↓
Vercel deploys — live in ~2 minutes
        ↓
Client visits live URL
```

**Key rules:**
- Remote branch is `main` (NOT `master`) — always `git push origin main`
- Working directory for Next.js is `/app` — all `npm` commands run from there
- Build command: `cd app && npm run build` — must pass before pushing
- Vercel project root is set to `/app`

---

## 4. Project Folder Structure

```
DD-Weekly-Dashboard/
├── PROJECT_BRAIN.md          ← THIS FILE — read at session start
├── INDEX.md                  — Master index of all docs
├── docs/                     — Architecture planning docs (blueprint, not yet built)
│   ├── 03-architecture.md
│   ├── 04-database-schema.md
│   ├── 10-data-sources.md
│   └── modules/              — Per-module specs (15 modules planned)
└── app/                      — THE ACTUAL NEXT.JS APP
    ├── CLAUDE.md             — Protected code rules (Leads button — DO NOT TOUCH)
    ├── AGENTS.md             — Next.js version warning
    ├── src/
    │   ├── app/
    │   │   ├── (client)/client/dashboard/
    │   │   │   └── page.tsx  ← MAIN FILE — 3000+ lines, all dashboard tabs
    │   │   └── api/          — Next.js API routes (GA4, GSC data fetching)
    │   └── lib/
    │       ├── benchmarks.ts — CTR targets, traffic growth benchmarks
    │       └── db/           — Drizzle ORM schema + queries
    ├── package.json
    └── next.config.ts
```

---

## 5. The Main File: `page.tsx`

**Path:** `app/src/app/(client)/client/dashboard/page.tsx`
**Size:** ~3,000+ lines — single large component

### Dashboard Tabs
The dashboard has multiple tabs rendered via an `activeTab` state:
- `overview` — Executive summary
- `traffic` — GA4 traffic breakdown ← **Most recently redesigned**
- `search` — GSC search performance (keywords, clicks, impressions)
- `landing` — Landing page performance
- `keywords` — Keyword ranking history (recently added)
- `leads` — Client leads

### Key Patterns in This File
- **IIFE pattern** for each tab: `{activeTab === "traffic" && (() => { ... })()}`
- **`fmt(n)`** — formats numbers: `1234 → "1.2K"`, `12345 → "12.3K"`
- **`pct(cur, prev)`** — returns `((cur - prev) / prev) * 100` change percentage
- **`makeTrend(prev, cur, seed)`** — generates 30-point simulated trend data with sine/cosine noise
- **`svgLine(points, maxY, w, h)`** — converts trend data to SVG path `d` attribute
- **`CH_COLORS`** map — consistent colors per channel across all charts
- **`brand`** variable — client brand color (available in outer scope)
- **`totalChannelSessions`** — defined at outer component scope (line ~1645), NOT inside the IIFE

### Key Interfaces
```typescript
interface ChannelRow {
  channel: string
  sessions: number
  users: number
  engagementRate: number   // 0–100 scale
  conversions: number
  prevSessions: number
}

interface GA4Totals {
  sessions: number
  users: number
  avgSessionDuration: number
  engagementRate: number
  engagedSessions: number
  // ...more fields
}
```

---

## 6. Traffic Tab — Complete Redesign (Last Major Work)

### What Was Changed
The Traffic tab IIFE (was lines 2102–2656) was completely rebuilt to match a reference design (KodoCare dashboard). Pushed as commit `8a50079`.

### New Traffic Tab Structure
```
12-column grid layout:
├── Left: 9 columns (main content)
│   ├── 5 KPI Cards (Total, Organic, Direct, Referral, Social Sessions)
│   ├── Trend Chart (SVG, 6 lines) + Donut Chart — side by side
│   ├── Channel Performance table (with status badges, bounce rate, key events)
│   ├── Traffic Quality table
│   └── 4-column dark summary card (Key Wins / Needs Attention / What We're Doing / Expected Impact)
└── Right: 3 columns (sidebar)
    ├── Key Insights (AI badge, structured title+description format)
    ├── Recommended Actions (numbered circles)
    ├── Top Opportunities (with impact metrics)
    ├── Country Breakdown
    └── Device Breakdown
```

### New Functions Added in Traffic Tab
```typescript
// Smart status badge logic
const statusBadge = (ch: ChannelRow, total: number) => { ... }
// Returns: "High Traffic Low Quality" | "Emerging" | "Needs Review" | 
//          "Monitor" | "Stable" | "Growing" | "Healthy" | "Low Volume"

// Weighted engagement rate (NOT simple average — weights by sessions)
const avgEngRate = totalChannelSessions > 0 
  ? channels.reduce((s, c) => s + c.sessions * (c.engagementRate / 100), 0) 
    / totalChannelSessions * 100 
  : 0

// Derived metrics
const directShare = (direct?.sessions / totalChannelSessions) * 100
const bounceRate = 100 - ch.engagementRate   // approximate
const keyEventRate = (ch.conversions / ch.sessions) * 100
```

### KPI Cards (5 cards)
| Card | Color | Channel |
|------|-------|---------|
| Total Sessions | #334155 slate | All channels combined |
| Organic Sessions | #10B981 green | "Organic Search" |
| Direct Sessions | #3B82F6 blue | "Direct" |
| Referral Sessions | #F59E0B amber | "Referral" |
| Social Sessions | #EC4899 pink | "Organic Social" |

### Trend Chart Lines
| Channel | Color | Style |
|---------|-------|-------|
| Total | #334155 | Solid, 2px |
| Organic | #10B981 | Solid, 1.5px |
| Direct | #3B82F6 | Solid, 1.5px |
| Referral | #F59E0B | Solid, 1.5px |
| Social | #EC4899 | Dashed 4 2 |
| AI Assistant | #06B6D4 cyan | Dashed 4 2 |

### Status Badge Logic
```
sessions < 5              → "Low Volume"
channel = "Cross-network" → "Low Volume"  
channel = "Unassigned" && sessions > 15 → "Needs Review"
share > 55% && eng < 45% → "High Traffic, Low Quality"
change < -20%             → "Needs Review"
change < -5%              → "Monitor"
sessions < 50 && change > 200% → "Emerging"
change > 30% && eng > 50% → "Healthy"
change > 30%              → "Growing"
|change| < 5%             → "Stable"
default                   → "Healthy"
```

---

## 7. Keywords Tab — Ranking History Feature

Recently added: keyword ranking history chart showing position over time.
- Commit: `3250c30` — "Add keyword ranking history feature"
- Shows position trend per keyword (lower = better for rankings)

---

## 8. Benchmarks File

**Path:** `app/src/lib/benchmarks.ts`

Key values set:
```typescript
CTR: { targetMin: 1.5, targetMax: 3 }
trafficGrowth: { target: 7 }
```

---

## 9. Protected Code — NEVER TOUCH

**From `app/CLAUDE.md`:**

The **Leads button** in the dashboard tab bar is PROTECTED:
- Always rendered unconditionally (no `{condition && ...}` wrapper)
- Located just after the main tabs loop in `page.tsx`
- Navigates to `/client/leads`
- DO NOT remove, move, wrap in conditional, or change its `onClick`

---

## 10. Coding Rules & Constraints

| Rule | Detail |
|------|--------|
| Language | English only in all responses — no Hindi words |
| Comments | No comments in code unless the WHY is non-obvious |
| Charts | Custom SVG only — no external chart libraries |
| State/hooks | `useState` etc. must go at component level — NOT inside IIFE tabs |
| Colors | Use `CH_COLORS` map for channel colors — keep consistent |
| Build | Must pass `npm run build` before pushing |
| Git branch | `main` (not `master`) |
| Bounce rate | Computed as `100 - engagementRate` (no separate API field) |
| Key Event Rate | Computed as `(conversions / sessions) * 100` |

---

## 11. Upcoming / Pending Work

### In Progress (Next Session Will Implement)
- [ ] **Interactive KPI ↔ Chart linking** — Click a KPI card to highlight its line in the trend chart
  - Dim all other lines to 10% opacity
  - Selected line: thicker (2.5px), area fill underneath
  - Show dot markers at each data point
  - Floating end-of-line value pill with slide-in animation
  - Count-up animation on the KPI card number (0 → current value, 600ms)
  - Need `trafficSelectedKpi` state at parent component level (not inside IIFE)

### Known Issues / To Fix
- [ ] Direct traffic often shows 70–80% share for KodaCars — this is likely a UTM tracking issue on the client side (not a dashboard bug, but worth surfacing in insights)

### Future Enhancements (Not Started)
- [ ] Per-channel avg session duration (GA4 data exists but not in current `ChannelRow` interface)
- [ ] Hover tooltips on trend chart
- [ ] Date range picker (currently uses fixed 30D window)
- [ ] PDF export for traffic tab

---

## 12. Client: KodaCars — Data Profile

Real data observed from the dashboard (as of Sept 2026):

| Channel | Sessions | vs Prior Period | Engagement |
|---------|---------|-----------------|-----------|
| Direct | ~1,500 | +59% | ~41% (Low) |
| Organic Search | ~200 | -13% | ~55% |
| Referral | ~164 | +49% | ~64% |
| Social | ~28 | +600% | varies |
| AI Assistant | ~4 | — | — |
| Unassigned | ~37 | — | — |

**Direct traffic at 75%+ = UTM tracking issue** (industry avg is 20–40%). This is the #1 insight surfaced.

---

## 13. Key Git Commits (Recent History)

| Commit | Description |
|--------|-------------|
| `8a50079` | Complete Traffic tab redesign matching KodoCare reference UI |
| `3250c30` | Add keyword ranking history feature |

---

## 14. How to Continue in a New Session

1. Open terminal in `c:\Users\Ashishv\Downloads\DD-Weekly-Dashboard`
2. Say: **"Read PROJECT_BRAIN.md and let's continue"**
3. Mention which tab/feature you want to work on
4. After any session with changes: ask Claude to **update PROJECT_BRAIN.md** with what changed

---

*Last updated: 2026-09-18 — Traffic tab redesign complete, KPI-chart interaction pending*
