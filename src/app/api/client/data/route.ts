export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyClientToken, COOKIE_NAME } from "@/lib/auth/client-auth"
import { db } from "@/lib/db"
import { clients, users, notifications } from "@/lib/db/schema"
import { eq, isNotNull } from "drizzle-orm"
import { getGSCMetrics, getTopKeywords, getLandingPages } from "@/lib/google/gsc"
import { getGA4Metrics, getDeviceBreakdown, getCountryTraffic } from "@/lib/google/ga4"
import { getDateRange } from "@/lib/dateRange"

async function refreshAccessToken(refreshToken: string, userEmail: string): Promise<string | null> {
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    })
    const data = await res.json()
    if (!res.ok) return null
    const newToken = data.access_token as string
    await db.update(users).set({ googleAccessToken: newToken }).where(eq(users.email, userEmail))
    return newToken
  } catch {
    return null
  }
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

  const [teamMember] = await db
    .select()
    .from(users)
    .where(isNotNull(users.googleAccessToken))
    .limit(1)

  if (!teamMember?.googleAccessToken) {
    // Silently return empty — admin will see notification
    await notifyAdmin(client.name)
    return NextResponse.json({ gsc: null, ga4: null, keywords: [], pages: [], devices: [], countries: [] })
  }

  let accessToken = teamMember.googleAccessToken
  const { startDate, endDate } = getDateRange(range)

  console.log(`[client/data] client=${client.name} gscUrl=${client.gscSiteUrl} ga4=${client.ga4PropertyId} hasToken=${!!accessToken} hasRefresh=${!!teamMember.googleRefreshToken}`)

  async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
    try { return await fn() } catch (e) {
      console.error(`[client/data] ${label} failed:`, e instanceof Error ? e.message : String(e))
      return fallback
    }
  }

  const runAll = (tok: string) => Promise.all([
    safe("gsc-metrics", () => client.gscSiteUrl
      ? getGSCMetrics(tok, client.gscSiteUrl!, startDate, endDate)
      : Promise.resolve(null), null),
    safe("ga4-metrics", () => client.ga4PropertyId
      ? getGA4Metrics(tok, client.ga4PropertyId!, startDate, endDate)
      : Promise.resolve(null), null),
    safe("gsc-keywords", () => client.gscSiteUrl
      ? getTopKeywords(tok, client.gscSiteUrl!, startDate, endDate, 25)
      : Promise.resolve([]), [] as Awaited<ReturnType<typeof getTopKeywords>>),
    safe("gsc-pages", () => client.gscSiteUrl
      ? getLandingPages(tok, client.gscSiteUrl!, startDate, endDate, 25)
      : Promise.resolve([]), [] as Awaited<ReturnType<typeof getLandingPages>>),
    safe("ga4-devices", () => client.ga4PropertyId
      ? getDeviceBreakdown(tok, client.ga4PropertyId!, startDate, endDate)
      : Promise.resolve([]), [] as Awaited<ReturnType<typeof getDeviceBreakdown>>),
    safe("ga4-countries", () => client.ga4PropertyId
      ? getCountryTraffic(tok, client.ga4PropertyId!, startDate, endDate)
      : Promise.resolve([]), [] as Awaited<ReturnType<typeof getCountryTraffic>>),
  ])

  let [gsc, ga4, keywords, pages, devices, countries] = await runAll(accessToken)

  // Both null = token likely expired — try silent auto-refresh
  if (!gsc && !ga4 && teamMember.googleRefreshToken) {
    const fresh = await refreshAccessToken(teamMember.googleRefreshToken, teamMember.email)
    if (fresh) {
      accessToken = fresh
      ;[gsc, ga4, keywords, pages, devices, countries] = await runAll(fresh)
    }
  }

  // Still no data after refresh — notify admin silently, return empty to client
  if (!gsc && !ga4) {
    await notifyAdmin(client.name)
    return NextResponse.json({ gsc: null, ga4: null, keywords: [], pages: [], devices: [], countries: [] })
  }

  return NextResponse.json({ gsc, ga4, keywords, pages, devices, countries })
}
