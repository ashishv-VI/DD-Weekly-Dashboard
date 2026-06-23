export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyClientToken, COOKIE_NAME } from "@/lib/auth/client-auth"
import { db } from "@/lib/db"
import { clients, users, notifications } from "@/lib/db/schema"
import { eq, isNotNull, and } from "drizzle-orm"
import { getGSCMetrics, getTopKeywords, getLandingPages } from "@/lib/google/gsc"
import { getGA4Metrics, getDeviceBreakdown, getCountryTraffic } from "@/lib/google/ga4"
import { getDateRange } from "@/lib/dateRange"
// Uses super_admin's OAuth token — the account that has access to all client properties
function getAccessToken(superAdmin: { googleAccessToken: string | null } | undefined): string | null {
  return superAdmin?.googleAccessToken ?? null
}

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

  const [client] = await db.select().from(clients).where(eq(clients.id, payload.sub)).limit(1)
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 })

  if (!client.ga4PropertyId && !client.gscSiteUrl) {
    return NextResponse.json({ error: "No GA4 or GSC configured for this client" }, { status: 400 })
  }

  const [teamMember] = await db.select().from(users).where(and(isNotNull(users.googleAccessToken), eq(users.role, "super_admin"))).limit(1)

  const accessToken = await getAccessToken(teamMember)
  if (!accessToken) {
    await notifyAdmin(client.name)
    return NextResponse.json({ gsc: null, ga4: null, keywords: [], pages: [], devices: [], countries: [] })
  }

  const { startDate, endDate } = getDateRange(range)

  async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
    try { return await fn() } catch (e) {
      console.error(`[client/data] ${label} failed:`, e instanceof Error ? e.message : String(e))
      return fallback
    }
  }

  const [gsc, ga4, keywords, pages, devices, countries] = await Promise.all([
    safe("gsc-metrics", () => client.gscSiteUrl
      ? getGSCMetrics(accessToken, client.gscSiteUrl!, startDate, endDate)
      : Promise.resolve(null), null),
    safe("ga4-metrics", () => client.ga4PropertyId
      ? getGA4Metrics(accessToken, client.ga4PropertyId!, startDate, endDate)
      : Promise.resolve(null), null),
    safe("gsc-keywords", () => client.gscSiteUrl
      ? getTopKeywords(accessToken, client.gscSiteUrl!, startDate, endDate, 25)
      : Promise.resolve([]), [] as Awaited<ReturnType<typeof getTopKeywords>>),
    safe("gsc-pages", () => client.gscSiteUrl
      ? getLandingPages(accessToken, client.gscSiteUrl!, startDate, endDate, 25)
      : Promise.resolve([]), [] as Awaited<ReturnType<typeof getLandingPages>>),
    safe("ga4-devices", () => client.ga4PropertyId
      ? getDeviceBreakdown(accessToken, client.ga4PropertyId!, startDate, endDate)
      : Promise.resolve([]), [] as Awaited<ReturnType<typeof getDeviceBreakdown>>),
    safe("ga4-countries", () => client.ga4PropertyId
      ? getCountryTraffic(accessToken, client.ga4PropertyId!, startDate, endDate)
      : Promise.resolve([]), [] as Awaited<ReturnType<typeof getCountryTraffic>>),
  ])

  if (!gsc && !ga4) {
    await notifyAdmin(client.name)
    return NextResponse.json({ gsc: null, ga4: null, keywords: [], pages: [], devices: [], countries: [] })
  }

  return NextResponse.json({ gsc, ga4, keywords, pages, devices, countries })
}

