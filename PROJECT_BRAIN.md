# PROJECT_BRAIN.md
## DD Weekly Dashboard — Complete Project Context

> **How to use this file:** At the start of any new session, say "Read PROJECT_BRAIN.md and let's continue" and we pick up exactly where we left off — no re-explaining needed.
> **Keep this updated:** After every session where changes are made, update this file and push to GitHub.

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
| Deployment | **Vercel** | Auto-deploys from GitHub `main` branch of `/app` |
| Charts | **Custom SVG** | No external chart library — all hand-coded SVG paths |
| Auth | **Google OAuth** | Clients log in with Google |
| Data sources | **GA4 API + GSC API** | Google Analytics Data API v1 + Search Console API v3 |

> **Note:** The `docs/` folder describes a planned NestJS + Redis + BullMQ backend. That is the blueprint — it has NOT been built yet. What's actually running is Next.js with server-side API routes hitting Neon PostgreSQL directly via Drizzle.

---

## 3. How It's Connected (Deployment Pipeline)

```
Developer edits code locally  (in /app directory)
        ↓
git push origin main  (inside /app — this is the repo Vercel watches)
https://github.com/ashishv-VI/DD-Weekly-Dashboard  (app/ has its own git)
        ↓
Vercel auto-detects push → triggers build
        ↓
npm run build  (inside /app)
        ↓
Vercel deploys — live in ~2 minutes
        ↓
Client visits live URL
```

**Key rules:**
- `/app` directory has its OWN git repo (`main` branch) — Vercel watches this
- Root repo (`master` branch) holds docs + PROJECT_BRAIN.md only — NOT deployed to Vercel
- Always `cd app` before git commands for the live deployment
- Always `git push origin main` (NOT master) for Vercel to pick it up
- `npm run build` must pass before pushing

---

## 4. Project Folder Structure

```
DD-Weekly-Dashboard/              ← Root repo (master branch — docs only, NOT on Vercel)
├── PROJECT_BRAIN.md              ← THIS FILE — read at session start
├── INDEX.md                      — Master index of all docs
├── docs/                         — Architecture planning docs (blueprint, not yet built)
│   ├── 03-architecture.md
│   ├── 04-database-schema.md
│   ├── 10-data-sources.md
│   └── modules/                  — Per-module specs (15 modules planned)
└── app/                          ← SEPARATE git repo (main branch — DEPLOYED TO VERCEL)
    ├── CLAUDE.md                 — Protected code rules (Leads button — DO NOT TOUCH)
    ├── AGENTS.md                 — Next.js version warning
    ├── src/
    │   ├── app/
    │   │   ├── (client)/client/dashboard/
    │   │   │   └── page.tsx      ← MAIN FILE — 3200+ lines, all dashboard tabs
    │   │   └── api/              — Next.js API routes (GA4, GSC data fetching)
    │   └── lib/
    │       ├── benchmarks.ts     — CTR targets, traffic growth benchmarks
    │       └── db/               — Drizzle ORM schema + queries
    ├── package.json
    └── next.config.ts
```

---

## 5. The Main File: `page.tsx`

**Path:** `app/src/app/(client)/client/dashboard/page.tsx`
**Size:** ~3,200+ lines — single large component

### Dashboard Tabs
| Tab key | What it shows |
|---------|--------------|
| `overview` | Executive summary |
| `traffic` | GA4 traffic breakdown ← **Most work done here** |
| `search` | GSC search performance (keywords, clicks, impressions) |
| `landing` | Landing page performance |
| `keywords` | Keyword ranking history |
| `leads` | Client leads |

### Key Patterns in This File
- **IIFE pattern** for each tab: `{activeTab === "traffic" && (() => { ... })()}`
- **`fmt(n)`** — formats numbers: `1234 → "1.2K"`, `12345 → "12.3K"`
- **`pct(cur, prev)`** — returns `((cur - prev) / prev) * 100` change percentage
- **`makeTrend(prev, cur, seed)`** — generates N-point simulated trend data (30D default) with sine/cosine noise
- **`svgLine(points, maxY, w, h)`** — converts trend data to SVG path `d` attribute
- **`svgArea(points, maxY, w, h)`** — same but closed path for area fill
- **`sparkPts(prev, cur)`** — 14-point spark line for KPI cards
- **`CH_COLORS`** map — consistent colors per channel across all charts
- **`fmtK(n)`** — formats numbers for chart y-axis ticks (e.g. `1.5k`)
- **`totalChannelSessions`** — defined at outer component scope (~line 1650), NOT inside IIFE

### Component-Level State (NOT inside IIFE)
```typescript
const [activeTab, setActiveTab] = useState<TabKey>("overview")
const [trafficSelectedKpi, setTrafficSelectedKpi] = useState<string | null>(null)
const [trafficHoverIdx, setTrafficHoverIdx] = useState<number | null>(null)
const [trafficPeriod, setTrafficPeriod] = useState<"7D"|"30D"|"90D">("30D")
```

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
```

---

## 6. Traffic Tab — Full Feature List (Current State)

### Layout
```
12-column grid:
├── Left: 9 columns
│   ├── 5 KPI Cards (clickable — links to chart)
│   ├── Traffic Trend Chart (SVG, 6 lines, hover crosshair) + Donut Chart
│   ├── "Where Your Traffic Comes From" table (merged, client-friendly)
│   └── 4-column dark summary card (Key Wins / Needs Attention / What We're Doing / Expected Impact)
└── Right: 3 columns (sidebar)
    ├── Key Insights (AI badge, structured title+description)
    ├── Recommended Actions (numbered circles)
    ├── Top Opportunities (with impact metrics)
    ├── Country Breakdown
    └── Device Breakdown
```

### Feature 1 — KPI Cards (5 cards, clickable)
| Card | Color | Channel |
|------|-------|---------|
| Total Sessions | #334155 | All channels |
| Organic Sessions | #10B981 | "Organic Search" |
| Direct Sessions | #3B82F6 | "Direct" |
| Referral Sessions | #F59E0B | "Referral" |
| Social Sessions | #EC4899 | "Organic Social" |

**Click behavior:**
- Click a card → colored border appears, icon scales up, other chart lines fade to 10% opacity
- Selected line: thicker (2.5px) + area fill underneath + dot markers + animated value pill at line end
- KPI number plays `@keyframes kpiCountUp` bounce animation
- Click same card again → deselect, all lines return to normal

### Feature 2 — Traffic Trend Chart (Interactive)
**Lines:** Total (solid #334155), Organic (solid #10B981), Direct (solid #3B82F6), Referral (solid #F59E0B), Social (dashed #EC4899), AI (dashed #06B6D4)

**Hover crosshair (NEW):**
- Move cursor over chart → dashed vertical line follows cursor
- Colored dots appear on each channel at that date's value
- Tooltip card pops up showing:
  - Date at top (e.g. "4 Sept")
  - "vs {start date}" comparison label
  - Each channel: name + value (e.g. `Direct — 1.6K`) + % change vs period start (e.g. `↑ 12%`)
  - % color: green = up, red = down, grey = flat
  - Tooltip flips left when cursor is in right half of chart
- If a KPI card is selected: its dot is larger (5.5px) and name is bold in tooltip

### Feature 3 — "Where Your Traffic Comes From" Table (Merged)
Replaced the two old redundant tables (Traffic Channel Performance + Traffic Quality) with one client-friendly table.

**Columns:**
| Column | What it shows |
|--------|--------------|
| Channel | Name + color + % of total traffic |
| Visitors | Session count + "prev X" below |
| vs Last Period | ↑/↓ pill (green/red) |
| Visitor Quality | Bar + % + word label (Good/Fair/Low) |
| Engaged Visitors | Actual count + "of X visitors" |
| Health | Smart status badge |

**Bottom legend:** Plain-English explanation of "Visitor Quality" and "Engaged Visitors"

### Feature 4 — Status Badge Logic
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

### Feature 5 — Structured Insights (Right Sidebar)
Dynamic insights generated from real data:
- Direct > 55% → "Direct traffic unusually high" (alert)
- Organic > +15% → "Organic traffic growing" (positive)
- avgEngRate < 47% → "Engagement rate declining" (warning)
- Referral > +50% → "Referral traffic surging" (positive)

### Feature 6 — 4-Column Dark Summary Card
Key Wins (emerald) | Needs Attention (amber) | What We're Doing (blue) | Expected Impact (purple)
All dynamically populated from real channel data.

---

## 7. Keywords Tab — Ranking History

- Commit `3250c30` — keyword ranking history chart showing position over time
- Lower position number = better ranking
- SVG line chart per keyword

---

## 8. Benchmarks File

**Path:** `app/src/lib/benchmarks.ts`
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
| Comments | No comments unless the WHY is non-obvious |
| Charts | Custom SVG only — no external chart libraries |
| State/hooks | `useState` must go at component level — NOT inside IIFE tabs |
| Colors | Use `CH_COLORS` map for channel colors — keep consistent |
| Build | Must pass `npm run build` before pushing |
| Git for Vercel | `cd app && git push origin main` |
| Git for docs | root repo `git push origin master` |
| Bounce rate | Computed as `100 - engagementRate` (no separate API field) |
| Key Event Rate | Computed as `(conversions / sessions) * 100` |
| Engaged Sessions | Computed as `Math.round(sessions * engagementRate / 100)` |

---

## 11. All Changes Made (Chronological)

| Commit | Branch | Description |
|--------|--------|-------------|
| `3250c30` | main (app/) | Add keyword ranking history feature |
| `8a50079` | main (app/) | Complete Traffic tab redesign matching KodoCare reference UI |
| `e51078f` | main (app/) | Interactive KPI card ↔ chart linking (click to highlight line) |
| `97f5a1a` | main (app/) | Fix chart end label overflow at right edge |
| `c12fa5d` | main (app/) | Merge two traffic tables into one client-friendly "Where Your Traffic Comes From" table |
| `233a059` | main (app/) | Add hover crosshair + tooltip to Traffic Trend chart |

---

## 12. Client: KodaCars — Data Profile

Real data observed (as of Sept 2026):

| Channel | Sessions | vs Prior Period | Engagement | Status Badge |
|---------|---------|-----------------|-----------|--------------|
| Direct | ~1,500 | +59% | ~41% | High Traffic, Low Quality |
| Organic Search | ~200 | -13% | ~55% | Monitor |
| Referral | ~165 | +50% | ~67% | Healthy |
| Organic Social | ~28 | +600% | ~54% | Emerging |
| Unassigned | ~24 | +243% | 0% | Needs Review |
| AI Assistant | ~4 | — | 100% | Low Volume |
| Cross-network | ~3 | — | 0% | Low Volume |

**Key insight:** Direct at 75%+ = UTM tracking issue (industry avg 20–40%). Surfaced automatically in Key Insights sidebar.

---

## 13. Pending / Future Work

- [ ] Per-channel avg session duration (data exists in GA4 but not in `ChannelRow` interface yet)
- [ ] Date range picker (currently fixed 30D/7D/90D toggle)
- [ ] PDF export for traffic tab
- [ ] Real per-day data in hover tooltip (currently uses simulated trend values)

---

## 14. How to Continue in a New Session

1. Open terminal in `c:\Users\Ashishv\Downloads\DD-Weekly-Dashboard`
2. Say: **"Read PROJECT_BRAIN.md and let's continue"**
3. For code changes: work inside `/app` directory
4. After any session with changes: ask Claude to **update PROJECT_BRAIN.md and push to GitHub**

---

*Last updated: 2026-09-18 — Hover crosshair tooltip, merged channel table, KPI-chart interaction all complete*
