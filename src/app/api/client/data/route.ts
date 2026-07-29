export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyClientToken, COOKIE_NAME } from "@/lib/auth/client-auth"
import { db } from "@/lib/db"
import { clients, notifications } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getGSCMetrics, getTopKeywords, getLandingPages, getKeywordsWithPages } from "@/lib/google/gsc"
import {
  getGA4Metrics, getDeviceBreakdown, getCountryTraffic,
  getTrafficByChannel, getAITraffic, getUserBreakdown, getPagePerformance,
} from "@/lib/google/ga4"
import { getDateRange } from "@/lib/dateRange"
import { getSuperAdminToken } from "@/lib/auth/get-super-admin-token"

async function notifyAdmin(clientName: string) {
  try {
    await db.insert(notifications).values({
      type: "token_expired",
      title: "Google Re-connection Required",
      message: `Data for "${clientName}" could not be fetched. Please sign in again at /login to reconnect Google.`,
    })
  } catch { /* silent */ }
}

export async function GET(req: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const payload = await verifyClientToken(token)
  if (!payload) return NextResponse.json({ error: "Invalid session" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const range = searchParams.get("range") || "30d"
  const qStart = searchParams.get("startDate")
  const qEnd = searchParams.get("endDate")

  const [client] = await db.select().from(clients).where(eq(clients.id, payload.sub)).limit(1)
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 })

  if (!client.ga4PropertyId && !client.gscSiteUrl) {
    return NextResponse.json({ error: "No GA4 or GSC configured for this client" }, { status: 400 })
  }

  const accessToken = await getSuperAdminToken()
  if (!accessToken) {
    await notifyAdmin(client.name)
    return NextResponse.json({ gsc: null, ga4: null, keywords: [], keywordsWithPages: [], pages: [], devices: [], countries: [], channels: [], aiTraffic: null, userBreakdown: [] })
  }

  const { startDate, endDate } = (qStart && qEnd)
    ? { startDate: qStart, endDate: qEnd }
    : getDateRange(range)

  async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
    try { return await fn() } catch (e) {
      console.error(`[client/data] ${label} failed:`, e instanceof Error ? e.message : String(e))
      return fallback
    }
  }

  const [gsc, ga4, keywords, keywordsWithPages, pages, devices, countries, channels, aiTraffic, userBreakdown, pagePerformance] = await Promise.all([
    safe("gsc-metrics", () => client.gscSiteUrl
      ? getGSCMetrics(accessToken, client.gscSiteUrl!, startDate, endDate)
      : Promise.resolve(null), null),
    safe("ga4-metrics", () => client.ga4PropertyId
      ? getGA4Metrics(accessToken, client.ga4PropertyId!, startDate, endDate)
      : Promise.resolve(null), null),
    safe("gsc-keywords", () => client.gscSiteUrl
      ? getTopKeywords(accessToken, client.gscSiteUrl!, startDate, endDate, 25)
      : Promise.resolve([]), [] as Awaited<ReturnType<typeof getTopKeywords>>),
    safe("gsc-keywords-pages", () => client.gscSiteUrl
      ? getKeywordsWithPages(accessToken, client.gscSiteUrl!, startDate, endDate, 50)
      : Promise.resolve([]), [] as Awaited<ReturnType<typeof getKeywordsWithPages>>),
    safe("gsc-pages", () => client.gscSiteUrl
      ? getLandingPages(accessToken, client.gscSiteUrl!, startDate, endDate, 25)
      : Promise.resolve([]), [] as Awaited<ReturnType<typeof getLandingPages>>),
    safe("ga4-devices", () => client.ga4PropertyId
      ? getDeviceBreakdown(accessToken, client.ga4PropertyId!, startDate, endDate)
      : Promise.resolve([]), [] as Awaited<ReturnType<typeof getDeviceBreakdown>>),
    safe("ga4-countries", () => client.ga4PropertyId
      ? getCountryTraffic(accessToken, client.ga4PropertyId!, startDate, endDate)
      : Promise.resolve([]), [] as Awaited<ReturnType<typeof getCountryTraffic>>),
    safe("ga4-channels", () => client.ga4PropertyId
      ? getTrafficByChannel(accessToken, client.ga4PropertyId!, startDate, endDate)
      : Promise.resolve([]), [] as Awaited<ReturnType<typeof getTrafficByChannel>>),
    safe("ga4-ai-traffic", () => client.ga4PropertyId
      ? getAITraffic(accessToken, client.ga4PropertyId!, startDate, endDate)
      : Promise.resolve(null), null),
    safe("ga4-user-breakdown", () => client.ga4PropertyId
      ? getUserBreakdown(accessToken, client.ga4PropertyId!, startDate, endDate)
      : Promise.resolve([]), [] as Awaited<ReturnType<typeof getUserBreakdown>>),
    safe("ga4-page-perf", () => client.ga4PropertyId
      ? getPagePerformance(accessToken, client.ga4PropertyId!, startDate, endDate)
      : Promise.resolve([]), [] as Awaited<ReturnType<typeof getPagePerformance>>),
  ])

  if (!gsc && !ga4) {
    await notifyAdmin(client.name)
    return NextResponse.json({ gsc: null, ga4: null, keywords: [], keywordsWithPages: [], pages: [], devices: [], countries: [], channels: [], aiTraffic: null, userBreakdown: [], pagePerformance: [] })
  }

  return NextResponse.json({ gsc, ga4, keywords, keywordsWithPages, pages, devices, countries, channels, aiTraffic, userBreakdown, pagePerformance })
}
