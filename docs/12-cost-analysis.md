# Cost Analysis

## Google APIs (Free)

| API | Cost | Quota |
|-----|------|-------|
| GA4 Data API | Free | 200,000 tokens/day |
| GSC Search Analytics API | Free | 2,000 requests/day |
| CrUX API | Free | 150 requests/day |
| Google OAuth | Free | Unlimited |
| Google PageSpeed Insights API | Free | 25,000 requests/day |

**Total Google API Cost: $0/month**

---

## Third-Party APIs (Unresolved — Estimate)

| Service | Purpose | Monthly Cost |
|---------|---------|-------------|
| DataForSEO (starter) | Competitor keyword data | ~$50–$200 |
| SEMrush API | Competitor + keyword gap | $400–$1,500 |
| Ahrefs API | Competitor + backlink data | $500–$2,000 |
| BrightEdge / Conductor | GEO/AI visibility | $3,000+ |

**Decision needed: Which competitor data provider?**

---

## Infrastructure (Google Cloud — Estimate)

| Service | Config | Monthly Cost |
|---------|--------|-------------|
| Cloud Run (NestJS) | 2 vCPU, 4GB RAM, min 1 instance | ~$50–$150 |
| Cloud SQL (PostgreSQL) | db-standard-1, 100GB SSD | ~$50–$100 |
| Memorystore (Redis) | 1GB basic tier | ~$30–$50 |
| Cloud Storage (reports/PDFs) | 100GB | ~$2 |
| Cloud Scheduler | 7 cron jobs/day | ~$0.10 |
| **Total Infrastructure** | | **~$130–$300/month** |

---

## Frontend Hosting (Vercel)

| Plan | Cost | Limits |
|------|------|--------|
| Hobby | Free | Personal use only |
| Pro | $20/month | 10 team members |
| Enterprise | Custom | SSO, SLA |

**Recommended: Vercel Pro at $20/month for team access**

---

## AI Agents (LLM API Costs — Estimate)

Nightly run for 10 clients, 6 agents per run:

| Model | Cost per 1M tokens | Est. tokens/night | Monthly |
|-------|------------------|--------------------|---------|
| Claude Sonnet 4.6 | $3 input / $15 output | ~500K tokens | ~$30–$50 |
| GPT-4o | $5 input / $15 output | ~500K tokens | ~$40–$70 |
| Gemini 1.5 Pro | $3.50 input / $10.50 output | ~500K tokens | ~$25–$50 |

**Scales with number of clients. At 50 clients: ~$150–$250/month.**

---

## Email Delivery

| Provider | Free Tier | Paid |
|----------|-----------|------|
| Resend | 3,000/month free | $20/month for 50K |
| SendGrid | 100/day free | $19.95/month for 50K |
| AWS SES | None | ~$0.10 per 1,000 |

**Recommended: Resend (developer-friendly, generous free tier)**

---

## Monitoring

| Tool | Cost |
|------|------|
| Sentry (Team) | $26/month |
| OpenTelemetry | Free (self-hosted) or Cloud Monitoring |

---

## Total Estimated Monthly Cost

### Minimum (Phase 1, small number of clients)

| Item | Cost |
|------|------|
| Google Cloud infrastructure | $130 |
| Vercel Pro | $20 |
| Resend (email) | $0 (free tier) |
| Sentry | $26 |
| LLM API (Phase 4 only) | $0 |
| **Total Phase 1** | **~$176/month** |

### Phase 2–3 (with competitor data)

| Item | Cost |
|------|------|
| Phase 1 costs | $176 |
| DataForSEO | $100 |
| Crawler worker (Cloud Run) | $50 |
| **Total Phase 2–3** | **~$326/month** |

### Phase 4 (with AI agents, 10 clients)

| Item | Cost |
|------|------|
| Phase 2–3 costs | $326 |
| LLM API (Claude) | $50 |
| **Total Phase 4** | **~$376/month** |

### Scale (50 clients, all phases)

| Item | Cost |
|------|------|
| Google Cloud (scaled) | $400–$600 |
| Competitor API (SEMrush) | $400 |
| LLM API (Claude) | $200 |
| Email (scaled) | $20 |
| Sentry | $26 |
| Vercel | $20 |
| **Total at 50 clients** | **~$1,066–$1,266/month** |

---

## Open Questions

- [ ] What is the per-client pricing model? SaaS tiers?
- [ ] Who pays for third-party API costs — platform or passed to client?
- [ ] Is there a free trial or freemium tier?
- [ ] At what client count does the platform become profitable?
