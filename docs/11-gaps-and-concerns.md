# Gaps & Concerns

## Critical Gaps (Must Resolve Before Building That Phase)

| # | Gap | Affects | Resolution Needed |
|---|-----|---------|------------------|
| C1 | **No data source for Competitor Intelligence** | Module 12, Phase 3 | Choose: Ahrefs / SEMrush / DataForSEO / custom |
| C2 | **No API exists for GEO/AI Visibility tracking** | Module 11, Phase 3 | Define methodology before Phase 3 starts |
| C3 | **No web crawler in architecture** | Module 9, Module 10, Phase 2 | Add Playwright-based crawler worker to infrastructure |
| C4 | **GSC API quota is 2,000 requests/day** | All GSC data, multi-client | Design quota pooling strategy before Phase 1 ships |
| C5 | **AI agent LLM not specified** | All agents, Phase 4 | Choose model (Claude, GPT-4o, Gemini) + set cost budget |
| C6 | **NestJS cannot run on Vercel** | Backend hosting | Move NestJS to Google Cloud Run; Vercel for frontend only |

---

## Important Gaps (Should Resolve Before Phase End)

| # | Gap | Affects | Resolution Needed |
|---|-----|---------|------------------|
| I1 | **No email provider chosen** | Module 15 Alerts, Report delivery | Choose SendGrid / Resend / Postmark before Phase 1 |
| I2 | **No ORM specified** | All backend DB access | Choose Prisma or TypeORM for NestJS |
| I3 | **No chart library specified** | All dashboard modules | Choose Recharts / Nivo / Tremor |
| I4 | **No PDF generation library** | Module 14 Report Center | Choose Puppeteer / @react-pdf/renderer |
| I5 | **AI traffic detection accuracy is ~60-80%** | Module 6 | Accept limitation and document it in UI |
| I6 | **No RBAC / user roles defined** | All modules | Define: Admin, Agency, Client, Viewer roles |
| I7 | **No white-label support** | Agency use case | Decide: in scope or Phase 5? |
| I8 | **Multi-tenancy isolation not designed** | All analytics data | Add row-level filtering pattern to all repository queries |
| I9 | **WhatsApp Business API requires Meta approval** | Module 15 | Start approval process early (takes weeks) |
| I10 | **No data retention policy** | PostgreSQL storage costs | Define TTL per table type |

---

## Minor Gaps (Can Resolve During Build)

| # | Gap | Affects | Resolution Needed |
|---|-----|---------|------------------|
| M1 | Phase timelines not defined | Roadmap | Add time estimates to each phase |
| M2 | No CrUX API quota strategy | Module 9 Core Web Vitals | CrUX is 150 req/day free; plan accordingly |
| M3 | GEO Score formula not defined | Module 11 | Design formula before Phase 3 |
| M4 | AI Visibility Score formula not defined | Module 11 | Design formula before Phase 3 |
| M5 | Manual "sync now" button not in spec | UX | Decide: do users need on-demand sync? |
| M6 | No onboarding flow for new users | UX | Design first-run experience |
| M7 | No pagination strategy for large keyword tables | Module 4 | Add server-side pagination |
| M8 | Dead letter queue notification owner not defined | Automation | Assign alert recipient for failed jobs |
| M9 | No CDN strategy for static assets | Frontend performance | Configure Vercel Edge Network |
| M10 | No definition of "AI Mentions" tracking methodology | Module 11 | Define what constitutes a "mention" |

---

## What Is Missing From the Blueprint Entirely

| Item | Why It Matters |
|------|---------------|
| **User Roles & Permissions (RBAC)** | Who can see what? Agency vs client vs admin |
| **White-label reports** | Agencies need branded reports for clients |
| **Onboarding flow** | New users need guidance to connect GA4 + GSC |
| **Pricing / subscription model** | Not defined — affects architecture (quotas per tier) |
| **API for clients** | Enterprise clients may want programmatic access |
| **Audit trail UI** | Audit logs table exists but no UI planned |
| **Data export for clients** | Beyond PDF/CSV — raw data exports? |
| **Timezone handling** | Reports and dashboards — user timezone or UTC? |
| **Crawler rate limiting** | Respect client website robots.txt and avoid bans |
| **Session recording / heatmaps** | Not in scope but often expected by SEO platforms |
| **Keyword rank tracking (daily)** | GSC position data is aggregate; true rank tracking needs separate tool |
| **Backlink monitoring** | Mentioned nowhere; often part of SEO platforms |
| **Content gap analysis detail** | Module 12 mentions it but no methodology |

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| GSC quota exhausted with many clients | High | High | Implement quota tracking + per-client scheduling |
| GEO visibility module cannot be built as described | High | Medium | Redesign module with realistic methodology |
| Competitor data API cost exceeds budget | Medium | High | Start with DataForSEO (cheapest), upgrade later |
| AI agent hallucinations in recommendations | Medium | Medium | Add human-review flag on AI-generated insights |
| Crawler blocked by client websites | Medium | Medium | Use polite crawl delays, respect robots.txt |
| WhatsApp API approval delayed | Low | Low | Launch alerts with Email + Slack first |
| NestJS memory leak in long-running sync jobs | Low | High | Use worker threads + memory limits on Cloud Run |
