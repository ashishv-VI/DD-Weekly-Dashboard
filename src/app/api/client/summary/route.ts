export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyClientToken, COOKIE_NAME } from "@/lib/auth/client-auth"
import { db } from "@/lib/db"
import { clients, users } from "@/lib/db/schema"
import { eq, isNotNull } from "drizzle-orm"
import { getGSCMetrics, getTopKeywords } from "@/lib/google/gsc"
import { getGA4Metrics } from "@/lib/google/ga4"
import { getDateRange } from "@/lib/dateRange"

function generateSummary(
  clientName: string,
  range: string,
  gsc: { totals: { clicks: number; impressions: number; ctr: number; position: number; prevClicks: number; prevImpressions: number } } | null,
  ga4: { totals: { sessions: number; users: number; engagementRate: number; conversions: number; prevSessions: number } } | null,
  topKeyword: string | null,
): string {
  const label = range === "7d" ? "this week" : range === "90d" ? "this quarter" : "this month"
  const lines: string[] = []

  if (gsc) {
    const t = gsc.totals
    const clickTrend = t.prevClicks > 0 ? ((t.clicks - t.prevClicks) / t.prevClicks) * 100 : 0
    const clickDir = clickTrend > 5 ? "increased" : clickTrend < -5 ? "decreased" : "stayed stable"
    const clickPct = Math.abs(clickTrend).toFixed(0)

    lines.push(
      `${clientName} received ${t.clicks.toLocaleString()} organic clicks ${label} — ` +
      (Math.abs(clickTrend) > 5
        ? `${clickDir} by ${clickPct}% compared to the previous period.`
        : `on par with the previous period.`)
    )

    if (t.position > 0) {
      const posLabel = t.position <= 3 ? "excellent (top 3)" : t.position <= 10 ? "strong (top 10)" : t.position <= 20 ? "good (top 20)" : "has room to improve"
      lines.push(`Average ranking position is ${t.position.toFixed(1)} — ${posLabel}.`)
    }

    if (t.impressions > 0) {
      lines.push(`The site appeared in ${t.impressions.toLocaleString()} Google searches with a ${t.ctr.toFixed(2)}% click-through rate.`)
    }
  }

  if (ga4) {
    const t = ga4.totals
    const sessionTrend = t.prevSessions > 0 ? ((t.sessions - t.prevSessions) / t.prevSessions) * 100 : 0
    lines.push(
      `Website received ${t.sessions.toLocaleString()} sessions from ${t.users.toLocaleString()} users` +
      (Math.abs(sessionTrend) > 5 ? `, a ${Math.abs(sessionTrend).toFixed(0)}% ${sessionTrend > 0 ? "increase" : "decrease"} vs last period.` : ".")
    )
    if (t.engagementRate > 0) {
      lines.push(`Engagement rate was ${t.engagementRate.toFixed(1)}% — visitors are ${t.engagementRate > 50 ? "actively interacting" : "browsing"} with the content.`)
    }
    if (t.conversions > 0) {
      lines.push(`${t.conversions} conversions recorded this period.`)
    }
  }

  if (topKeyword) {
    lines.push(`Top performing keyword: "${topKeyword}".`)
  }

  if (lines.length === 0) {
    lines.push(`SEO performance summary for ${clientName} — data is being collected.`)
  }

  lines.push("Report prepared by Damco Digital SEO Team.")
  return lines.join(" ")
}

export async function GET(req: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const payload = await verifyClientToken(token)
  if (!payload) return NextResponse.json({ error: "Invalid session" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const range = searchParams.get("range") || "30d"

  const [client] = await db.select().from(clients).where(eq(clients.id, payload.sub)).limit(1)
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 })

  const [teamMember] = await db.select().from(users).where(isNotNull(users.googleAccessToken)).limit(1)
  const accessToken = teamMember?.googleAccessToken
  if (!accessToken) return NextResponse.json({ error: "No Google account connected" }, { status: 400 })

  const { startDate, endDate } = getDateRange(range)

  const [gsc, ga4, keywords] = await Promise.all([
    client.gscSiteUrl ? getGSCMetrics(accessToken, client.gscSiteUrl, startDate, endDate) : Promise.resolve(null),
    client.ga4PropertyId ? getGA4Metrics(accessToken, client.ga4PropertyId, startDate, endDate) : Promise.resolve(null),
    client.gscSiteUrl ? getTopKeywords(accessToken, client.gscSiteUrl, startDate, endDate, 1) : Promise.resolve([]),
  ])

  const topKeyword = keywords[0]?.keyword ?? null
  const summary = generateSummary(client.name, range, gsc, ga4, topKeyword)

  return NextResponse.json({ summary })
}
