# Architecture Overview

## Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js + TypeScript | App framework, SSR, routing |
| UI Components | shadcn/ui + Tailwind CSS | Design system, styling |
| Backend | NestJS | REST API, business logic, auth |
| Database | PostgreSQL | Primary data store |
| Cache | Redis | Fast reads, session storage |
| Queue | BullMQ | Background job processing |
| Hosting (Frontend) | Vercel | Next.js deployment |
| Hosting (Backend) | Google Cloud | NestJS + PostgreSQL + Redis |
| Monitoring | Sentry | Error tracking |
| Observability | OpenTelemetry | Traces, metrics, logs |

---

## Data Pipeline Flow

```
Google OAuth
    ↓
GA4 API  ←→  GSC API
    ↓              ↓
Data Sync Engine (BullMQ Jobs)
    ↓
Data Warehouse (PostgreSQL)
    ↓
Analytics Engine
    ↓
Insight Engine (AI Agents)
    ↓
Dashboard (Next.js + Redis Cache)
```

---

## Frontend Architecture

```
Next.js App
├── /app
│   ├── (auth)/login          — Google OAuth login page
│   ├── (dashboard)/          — Protected dashboard routes
│   │   ├── executive         — Module 3
│   │   ├── search-console    — Module 4
│   │   ├── analytics         — Module 5
│   │   ├── ai-traffic        — Module 6
│   │   ├── landing-pages     — Module 7
│   │   ├── historical        — Module 8
│   │   ├── technical-seo     — Module 9
│   │   ├── schema            — Module 10
│   │   ├── geo-ai            — Module 11
│   │   ├── competitors       — Module 12
│   │   ├── conversions       — Module 13
│   │   ├── reports           — Module 14
│   │   └── alerts            — Module 15
│   └── api/                  — Next.js API routes (thin proxy to NestJS)
├── components/
│   ├── ui/                   — shadcn/ui base components
│   ├── charts/               — Chart components (library TBD)
│   ├── tables/               — Data table components
│   └── shared/               — Header, sidebar, filters
└── lib/
    ├── api/                  — API client
    └── auth/                 — Auth helpers
```

---

## Backend Architecture (NestJS)

```
NestJS App
├── modules/
│   ├── auth/                 — Google OAuth, JWT, session
│   ├── projects/             — Client/domain management
│   ├── ga4/                  — GA4 API integration
│   ├── gsc/                  — GSC API integration
│   ├── ai-traffic/           — AI traffic detection
│   ├── technical-seo/        — Crawler + audit engine
│   ├── schema/               — Schema.org validation
│   ├── competitors/          — Competitor data (TBD source)
│   ├── geo/                  — GEO/AI visibility tracking
│   ├── insights/             — AI insight generation
│   ├── alerts/               — Alert engine
│   ├── reports/              — Report generation
│   └── ai-agents/            — Agent orchestration
├── jobs/                     — BullMQ job definitions
├── common/                   — Guards, filters, interceptors
└── config/                   — Environment config
```

---

## Infrastructure

```
Google Cloud
├── Cloud Run           — NestJS backend containers
├── Cloud SQL           — PostgreSQL (managed)
├── Memorystore         — Redis (managed)
├── Cloud Storage       — Report PDFs, exports
└── Cloud Scheduler     — Cron triggers for nightly jobs

Vercel
└── Next.js frontend deployment

Sentry
└── Error tracking for both frontend and backend
```

---

## Security Architecture

| Concern | Implementation |
|---------|---------------|
| Auth tokens | HTTP-only cookies, no localStorage |
| API auth | JWT with short expiry |
| CSRF | CSRF tokens on all state-changing requests |
| Rate limiting | NestJS rate limit guard per IP and per user |
| Token refresh | Refresh token rotation on every use |
| Secrets | Google Cloud Secret Manager |
| Data isolation | Row-level tenant filtering on all queries |

---

## Open Questions / Gaps

- [ ] **NestJS on Vercel** — Vercel is serverless-first. NestJS needs persistent connections (Redis, BullMQ). Recommend Google Cloud Run for backend, Vercel only for frontend.
- [ ] **Chart library** — Not specified. Options: Recharts, Chart.js, Nivo, Tremor
- [ ] **ORM** — Not specified. Recommend Prisma or TypeORM for PostgreSQL with NestJS
- [ ] **Multi-region** — Not discussed. Single region acceptable for v1?
- [ ] **File storage** — Report PDFs need object storage. Not in blueprint.
- [ ] **Email service** — Alert emails need SMTP or transactional email provider (SendGrid, Resend, Postmark)
