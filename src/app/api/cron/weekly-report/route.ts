export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { clients } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getSuperAdminToken } from "@/lib/auth/get-super-admin-token"
import { getGSCMetrics, getTopKeywords } from "@/lib/google/gsc"
import { getGA4Metrics } from "@/lib/google/ga4"
import { getDateRange } from "@/lib/dateRange"
import { weeklyReportHtml, weeklyReportText } from "@/lib/email/template"
import { Resend } from "resend"

const ADMIN_EMAIL = process.env.REPORT_TO_EMAIL ?? "damcodigitalseo@gmail.com"


export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const accessToken = await getSuperAdminToken()
  if (!accessToken) {
    return NextResponse.json({ error: "No Google access token available" }, { status: 400 })
  }
  const resend = new Resend(process.env.RESEND_API_KEY ?? "placeholder")
  const allClients = await db.select().from(clients).where(eq(clients.status, "active"))
  const { startDate, endDate } = getDateRange("7d")

  const now = new Date()
  const period = `${startDate} – ${endDate}`
  const results: { client: string; status: string }[] = []

  for (const client of allClients) {
    if (!client.gscSiteUrl && !client.ga4PropertyId) continue
    try {
      const [gsc, ga4, keywords] = await Promise.all([
        client.gscSiteUrl ? getGSCMetrics(accessToken, client.gscSiteUrl, startDate, endDate) : Promise.resolve(null),
        client.ga4PropertyId ? getGA4Metrics(accessToken, client.ga4PropertyId, startDate, endDate) : Promise.resolve(null),
        client.gscSiteUrl ? getTopKeywords(accessToken, client.gscSiteUrl, startDate, endDate, 1) : Promise.resolve([]),
      ])

      const gscT = gsc?.totals
      const ga4T = ga4?.totals

      const clickTrend = gscT && gscT.prevClicks > 0
        ? ((gscT.clicks - gscT.prevClicks) / gscT.prevClicks) * 100 : 0
      const ga4Sessions = ga4T?.sessions ?? 0
      const ga4PrevSessions = ga4T?.prevSessions ?? 0
      const sessionTrend = ga4PrevSessions > 0
        ? ((ga4Sessions - ga4PrevSessions) / ga4PrevSessions) * 100 : 0

      const reportData = {
        clientName: client.name,
        domain: client.domain,
        period,
        clicks: gscT?.clicks ?? 0,
        impressions: gscT?.impressions ?? 0,
        ctr: gscT?.ctr ?? 0,
        position: gscT?.position ?? 0,
        sessions: ga4Sessions,
        users: ga4T?.users ?? 0,
        engagementRate: ga4T?.engagementRate ?? 0,
        clickTrend,
        sessionTrend,
        topKeyword: keywords[0]?.keyword ?? "",
        topKeywordClicks: keywords[0]?.clicks ?? 0,
      }

      await resend.emails.send({
        from: "Damco Digital SEO <reports@damcodigital.com>",
        to: [ADMIN_EMAIL],
        subject: `Weekly SEO Report — ${client.name} (${period})`,
        html: weeklyReportHtml(reportData),
        text: weeklyReportText(reportData),
      })

      results.push({ client: client.name, status: "sent" })
    } catch (e) {
      results.push({ client: client.name, status: `error: ${e instanceof Error ? e.message : String(e)}` })
    }
  }

  return NextResponse.json({ sent: results.length, results })
}
